import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
}

interface DepRow {
  task_id: string;
  prerequisite_task_id: string;
}

interface Slot {
  task_id: string;
  estimated_duration_minutes: number;
  scheduled_start: string;
  scheduled_end: string;
}

const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
const DEFAULT_DURATION = 60;
const MAX_DAILY_MINUTES = 6 * 60;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const SLOT_STEP_MINUTES = 15;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const workStart: number = typeof body.work_start_hour === "number" ? body.work_start_hour : WORK_START_HOUR;
    const workEnd: number = typeof body.work_end_hour === "number" ? body.work_end_hour : WORK_END_HOUR;

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, deadline")
      .eq("user_id", user.id);

    const { data: deps } = await supabase
      .from("task_dependencies")
      .select("task_id, prerequisite_task_id")
      .eq("user_id", user.id);

    // Only schedule incomplete tasks; completed ones keep any prior slot cleared.
    const incomplete = (tasks || []).filter((t: TaskRow) => t.status !== "completed");
    const depsList = (deps || []) as DepRow[];

    if (incomplete.length === 0) {
      return new Response(JSON.stringify({
        schedule: [],
        cleared: (tasks || []).filter((t: TaskRow) => t.status === "completed").map((t: TaskRow) => t.id),
        available: !!apiKey,
        message: "No incomplete tasks to schedule.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 1: estimate durations. Use Gemini if available, else heuristic.
    let durations = new Map<string, number>();
    if (apiKey) {
      try {
        durations = await estimateDurations(incomplete, apiKey);
      } catch {
        durations = heuristicDurations(incomplete);
      }
    } else {
      durations = heuristicDurations(incomplete);
    }

    // Step 2: deterministic scheduling algorithm.
    const schedule = buildSchedule(incomplete, depsList, durations, workStart, workEnd);

    // Completed tasks get their slots cleared.
    const cleared = (tasks || []).filter((t: TaskRow) => t.status === "completed").map((t: TaskRow) => t.id);

    return new Response(JSON.stringify({
      schedule,
      cleared,
      available: !!apiKey,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error",
      schedule: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function estimateDurations(tasks: TaskRow[], apiKey: string): Promise<Map<string, number>> {
  const compact = tasks.map((t, i) => ({
    idx: i,
    title: t.title,
    description: (t.description || "").slice(0, 200),
    priority: t.priority,
  }));

  const prompt = `You are a task estimation assistant. For each task below, estimate a realistic focused-work duration in minutes (between 15 and 240, rounded to nearest 15). Consider the title and description. Return ONLY JSON: { "estimates": [ { "idx": number, "minutes": number } ] }

Tasks:
${JSON.stringify(compact, null, 2)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  let parsed: { estimates?: { idx: number; minutes: number }[] } | null = null;
  try { parsed = JSON.parse(text); } catch { /* */ }

  const map = new Map<string, number>();
  for (const t of tasks) {
    const est = parsed?.estimates?.find((e) => e.idx === tasks.indexOf(t));
    let mins = est?.minutes ?? heuristicDuration(t);
    mins = Math.max(15, Math.min(240, Math.round(mins / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES));
    map.set(t.id, mins);
  }
  return map;
}

function heuristicDurations(tasks: TaskRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tasks) map.set(t.id, heuristicDuration(t));
  return map;
}

function heuristicDuration(t: TaskRow): number {
  const base = PRIORITY_WEIGHT[t.priority] ?? 2;
  const lenBonus = (t.description || "").length > 120 ? 30 : 0;
  return Math.min(240, DEFAULT_DURATION * base / 2 + lenBonus);
}

function buildSchedule(
  tasks: TaskRow[],
  deps: DepRow[],
  durations: Map<string, number>,
  workStart: number,
  workEnd: number,
): Slot[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const prereqs = new Map<string, string[]>();
  for (const d of deps) {
    if (!taskMap.has(d.task_id) || !taskMap.has(d.prerequisite_task_id)) continue;
    const arr = prereqs.get(d.task_id) || [];
    arr.push(d.prerequisite_task_id);
    prereqs.set(d.task_id, arr);
  }

  // Priority + deadline urgency sort key (lower = earlier).
  const sortKey = (t: TaskRow): number => {
    const pw = PRIORITY_WEIGHT[t.priority] ?? 2;
    let deadlineScore = 100;
    if (t.deadline) {
      const dl = new Date(t.deadline + "T23:59:59").getTime();
      const now = Date.now();
      const daysLeft = (dl - now) / 86400000;
      deadlineScore = daysLeft < 0 ? 0 : daysLeft <= 3 ? 10 : daysLeft <= 7 ? 25 : daysLeft <= 14 ? 50 : 80;
    }
    // higher priority weight and lower deadline score => schedule first
    return (4 - pw) * 100 + deadlineScore;
  };

  // Topological order respecting dependencies, tie-broken by sortKey.
  const scheduled = new Set<string>();
  const result: Slot[] = [];
  const slotEnds: number[] = []; // busy intervals as ms timestamps

  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  // Don't schedule before the current time today.
  const earliestGlobal = now.getTime() > startDate.getTime() + workStart * 3600000
    ? now.getTime()
    : startDate.getTime() + workStart * 3600000;

  const remaining = [...tasks];
  let guard = 0;
  while (remaining.length > 0 && guard < tasks.length * 5 + 50) {
    guard++;
    // Find tasks whose prerequisites are all scheduled (or not in our set).
    const ready = remaining.filter((t) => {
      const pres = prereqs.get(t.id) || [];
      return pres.every((p) => scheduled.has(p) || !taskMap.has(p));
    });
    if (ready.length === 0) {
      // Circular or unsatisfiable deps — fall back to scheduling the rest by key.
      remaining.sort((a, b) => sortKey(a) - sortKey(b));
      remaining.forEach((t) => scheduled.add(t.id));
      continue;
    }
    ready.sort((a, b) => sortKey(a) - sortKey(b));

    for (const t of ready) {
      const dur = durations.get(t.id) || DEFAULT_DURATION;
      const pres = prereqs.get(t.id) || [];
      const presLatestEnd = pres
        .map((p) => result.find((s) => s.task_id === p)?.scheduled_end)
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime())
        .reduce((mx, v) => Math.max(mx, v), earliestGlobal);

      const start = findFreeSlot(Math.max(presLatestEnd, earliestGlobal), dur, slotEnds, workStart, workEnd, t.deadline);
      const end = start + dur * 60000;
      slotEnds.push(start, end);
      slotEnds.sort((a, b) => a - b);
      scheduled.add(t.id);
      result.push({
        task_id: t.id,
        estimated_duration_minutes: dur,
        scheduled_start: new Date(start).toISOString(),
        scheduled_end: new Date(end).toISOString(),
      });
      const idx = remaining.indexOf(t);
      if (idx >= 0) remaining.splice(idx, 1);
    }
  }

  return result;
}

function findFreeSlot(
  earliest: number,
  durationMin: number,
  busy: number[],
  workStart: number,
  workEnd: number,
  deadline: string | null,
): number {
  const durMs = durationMin * 60000;
  let cursor = floorToSlot(earliest);
  const maxIterations = 365;
  for (let i = 0; i < maxIterations; i++) {
    const dayStart = startOfWorkday(cursor, workStart);
    const dayEnd = endOfWorkday(cursor, workEnd);
    const latestAcceptable = deadline ? new Date(deadline + "T23:59:59").getTime() : Infinity;

    let probe = Math.max(cursor, dayStart);
    while (probe + durMs <= dayEnd && probe + durMs <= latestAcceptable) {
      if (!overlaps(probe, probe + durMs, busy)) {
        // Enforce daily workload cap.
        const dayMinutes = computeDayLoad(probe, busy, workStart, workEnd);
        if (dayMinutes + durationMin <= MAX_DAILY_MINUTES) {
          return probe;
        }
      }
      probe += SLOT_STEP_MINUTES * 60000;
    }
    // Move to next day.
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(workStart, 0, 0, 0);
  }
  // Fallback: just return earliest even if overlapping (shouldn't happen normally).
  return floorToSlot(earliest);
}

function floorToSlot(ts: number): number {
  const d = new Date(ts);
  const min = d.getMinutes();
  d.setMinutes(Math.floor(min / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES, 0, 0);
  return d.getTime();
}

function startOfWorkday(ts: number, workStart: number): number {
  const d = new Date(ts);
  d.setHours(workStart, 0, 0, 0);
  return d.getTime();
}

function endOfWorkday(ts: number, workEnd: number): number {
  const d = new Date(ts);
  d.setHours(workEnd, 0, 0, 0);
  return d.getTime();
}

function overlaps(start: number, end: number, busy: number[]): boolean {
  for (let i = 0; i < busy.length; i += 2) {
    const bStart = busy[i];
    const bEnd = busy[i + 1];
    if (start < bEnd && end > bStart) return true;
  }
  return false;
}

function computeDayLoad(ts: number, busy: number[], workStart: number, _workEnd: number): number {
  const dayStart = startOfWorkday(ts, workStart);
  const dayEnd = dayStart + 24 * 3600000;
  let total = 0;
  for (let i = 0; i < busy.length; i += 2) {
    const bStart = Math.max(busy[i], dayStart);
    const bEnd = Math.min(busy[i + 1], dayEnd);
    if (bEnd > bStart) total += (bEnd - bStart) / 60000;
  }
  return total;
}
