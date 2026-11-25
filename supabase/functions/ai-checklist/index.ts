import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChecklistBody {
  situation: string;
}

const CHECKLIST_PROMPT = `You are LifeOS's life checklist assistant. The user describes a life situation. Suggest a practical checklist to help them prepare.

Rules:
- Provide required documents and optional documents as separate items.
- Include preparation tasks and relevant deadlines where applicable.
- Keep each item concise (title + optional short description).
- Mark required items is_required=true, optional ones is_required=false.
- Limit to 8-12 items total.
- Clearly frame this as general guidance, not guaranteed official requirements.

Return JSON in EXACTLY this shape:
{
  "title": string,
  "description": string,
  "items": [
    { "title": string, "description": string, "is_required": boolean }
  ]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { situation } = await req.json() as ChecklistBody;
    if (!situation || !situation.trim()) {
      return new Response(JSON.stringify({ error: "Situation is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (!apiKey) {
      return new Response(JSON.stringify({
        available: false,
        error: "Gemini API key is not configured.",
        suggestion: null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${CHECKLIST_PROMPT}\n\nSituation: ${situation}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({
        available: true,
        error: `Gemini request failed (${geminiRes.status}).`,
        suggestion: null,
        _detail: errText.slice(0, 400),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: { title?: string; description?: string; items?: any[] } | null = null;
    try { parsed = JSON.parse(text); } catch { /* */ }

    if (!parsed || !parsed.items || !Array.isArray(parsed.items)) {
      return new Response(JSON.stringify({
        available: true,
        error: "AI could not generate a checklist for this situation.",
        suggestion: null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      available: true,
      suggestion: {
        title: parsed.title || `Checklist: ${situation}`,
        description: parsed.description || "AI-generated checklist. Verify against official sources before relying on it.",
        items: parsed.items.map((it: any) => ({
          title: String(it.title || ""),
          description: it.description ? String(it.description) : undefined,
          is_required: !!it.is_required,
        })),
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
