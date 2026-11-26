import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Gather real user data
    const { data: docs } = await supabase
      .from("documents")
      .select("id, document_name, category, expiry_date, extraction_status, review_status")
      .eq("user_id", user.id);

    const { data: reminders } = await supabase
      .from("reminders")
      .select("id, title, due_date, status, priority")
      .eq("user_id", user.id);

    const { data: extracted } = await supabase
      .from("extracted_document_data")
      .select("document_id, extracted_json")
      .eq("user_id", user.id);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, deadline, document_id")
      .eq("user_id", user.id);

    const { data: deps } = await supabase
      .from("task_dependencies")
      .select("task_id, prerequisite_task_id")
      .eq("user_id", user.id);

    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({
        insights: [],
        available: !!apiKey,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        insights: [],
        available: false,
        error: "Gemini API key is not configured.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build a compact data summary for the model
    const today = new Date().toISOString().slice(0, 10);
    const extractedMap = new Map((extracted || []).map((e: any) => [e.document_id, e.extracted_json]));
    const docsSummary = (docs || []).map((d: any) => {
      const ej = extractedMap.get(d.id) || {};
      return {
        name: d.document_name,
        category: d.category,
        expiry_date: d.expiry_date,
        review_status: d.review_status,
        type: ej.document_type || null,
        authority: ej.issuing_authority || null,
      };
    });
    const pendingReminders = (reminders || []).filter((r: any) => r.status === "pending");
    const activeTasks = (tasks || []).filter((t: any) => t.status !== "completed");
    const depsList = deps || [];

    const dataContext = JSON.stringify({
      today,
      documents: docsSummary,
      pending_reminders: pendingReminders,
      active_tasks: activeTasks,
      task_dependencies: depsList,
    }, null, 2);

    const prompt = `You are LifeOS's deadline intelligence assistant. Given the user's real document, reminder, and task data, generate a concise daily briefing with 2-6 actionable insights.

Rules:
- Focus on what needs attention: approaching deadlines with incomplete tasks, overdue items, tasks blocked by incomplete prerequisites, expiring documents.
- Consider task status, preparation time, priority, and missing prerequisites.
- Each insight: a short title + a detail sentence (max 2 sentences).
- Severity: "alert" (urgent/<7 days or overdue), "warning" (within 30 days), "info" (longer-term or general).
- Only reference real documents/reminders/tasks from the data. Do not invent.
- If everything is fine, return an empty array.

Return JSON: { "insights": [ { "severity": "alert"|"warning"|"info", "title": string, "detail": string, "document_id": string|null, "task_id": string|null } ] }

User data:
${dataContext}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    );

    if (!geminiRes.ok) {
      return new Response(JSON.stringify({
        insights: [],
        available: true,
        error: `Gemini request failed (${geminiRes.status}).`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: { insights?: any[] } | null = null;
    try { parsed = JSON.parse(text); } catch { /* */ }

    const insights = (parsed?.insights || []).map((it: any, i: number) => ({
      id: `ai-${i}-${Math.random().toString(36).slice(2, 7)}`,
      severity: ["alert", "warning", "info"].includes(it.severity) ? it.severity : "info",
      title: String(it.title || "Insight"),
      detail: String(it.detail || ""),
      document_id: it.document_id || undefined,
      task_id: it.task_id || undefined,
    }));

    return new Response(JSON.stringify({
      insights,
      available: true,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error",
      insights: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
