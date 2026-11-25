import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractRequestBody {
  documentId: string;
  filePath: string;
  mimeType: string;
  fileName: string;
}

const VALID_CATEGORIES = ["Identity","Education","Finance","Insurance","Medical","Travel","Property","Other"] as const;

const EXTRACTION_PROMPT = `You are a document intelligence assistant for LifeOS, a personal life administration app.
You receive a document (PDF or image). Extract structured information from it.

Rules:
- Extract ONLY information clearly present in the document.
- Use null for any field you cannot confidently determine. NEVER invent or guess values.
- Set uncertain=true if any extracted field seems ambiguous or low-confidence.
- Provide a short (1-2 sentence) summary of what the document is.
- Classify into exactly one category from: Identity, Education, Finance, Insurance, Medical, Travel, Property, Other.
- Suggest 0-3 actionable tasks based on the document content (e.g. "Renew passport before expiry", "Pay premium by due date", "Submit application form").
- For each suggested action, include a deadline (YYYY-MM-DD) if a relevant date is found in the document, priority (low/medium/high), and source_evidence (a short quote or reference from the document supporting the suggestion).

Return JSON in EXACTLY this shape:
{
  "document_type": string | null,
  "name": string | null,
  "document_number": string | null,
  "issue_date": "YYYY-MM-DD" | null,
  "expiry_date": "YYYY-MM-DD" | null,
  "issuing_authority": string | null,
  "important_amounts": string | null,
  "important_clauses": string | null,
  "other_information": string | null,
  "summary": string | null,
  "uncertain": boolean,
  "category": "Identity" | "Education" | "Finance" | "Insurance" | "Medical" | "Travel" | "Property" | "Other",
  "suggested_actions": [
    {
      "title": string,
      "description": string | null,
      "deadline": "YYYY-MM-DD" | null,
      "priority": "low" | "medium" | "high",
      "source_evidence": string | null
    }
  ]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { documentId, filePath, mimeType, fileName } = await req.json() as ExtractRequestBody;
    if (!documentId || !filePath || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing required fields (documentId, filePath, mimeType)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        available: false,
        error: "Gemini API key is not configured. Add GEMINI_API_KEY as an edge function secret.",
        extracted: null, extracted_text: null, model: null, confidence: null, category: "Other",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const jwt = authHeader.replace("Bearer", "").trim();
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check: the documents row must exist, belong to this user,
    // and its stored file_path must match the path supplied by the client.
    // This prevents an authenticated user from extracting another user's file
    // by guessing a path, since the service role key bypasses Storage RLS.
    const { data: docRow, error: docErr } = await supabase
      .from("documents")
      .select("id, user_id, file_path")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr) {
      return new Response(JSON.stringify({
        available: false,
        error: `Could not verify document ownership: ${docErr.message}`,
        extracted: null, extracted_text: null, model: null, confidence: null, category: "Other",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!docRow || docRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (docRow.file_path !== filePath) {
      return new Response(JSON.stringify({
        available: false,
        error: "File path does not match the stored document record.",
        extracted: null, extracted_text: null, model: null, confidence: null, category: "Other",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download the file from Supabase Storage using the service role key
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("lifeos-documents")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({
        available: false,
        error: `Could not download file from storage: ${downloadError?.message || "unknown error"}`,
        extracted: null, extracted_text: null, model: null, confidence: null, category: "Other",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Convert blob to base64 for Gemini inlineData
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...(uint8.subarray(i, i + chunkSize) as unknown as number[]));
    }
    const fileBase64 = btoa(binary);

    if (fileBase64.length > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({
        available: false,
        error: "File is too large for AI extraction (max 15MB original file size).",
        extracted: null, extracted_text: null, model: null, confidence: null, category: "Other",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Gemini with inline file
    const inlineData = {
      inlineData: { mimeType, data: fileBase64 },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: EXTRACTION_PROMPT }, inlineData] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      let geminiMsg = `Gemini request failed (${geminiRes.status})`;
      try {
        const eJson = JSON.parse(errText);
        if (eJson?.error?.message) geminiMsg = `Gemini error: ${eJson.error.message}`;
      } catch { /* keep default */ }
      return new Response(JSON.stringify({
        available: false,
        error: geminiMsg,
        extracted: null, extracted_text: null, model: null, confidence: null, category: "Other",
        _detail: errText.slice(0, 500),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(text); } catch { /* malformed */ }

    if (!parsed) {
      return new Response(JSON.stringify({
        available: true,
        extracted: null,
        extracted_text: text || null,
        model: "gemini-2.0-flash",
        confidence: null,
        category: "Other",
        note: "AI could not produce structured output for this document.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const category = VALID_CATEGORIES.includes(parsed.category as typeof VALID_CATEGORIES[number])
      ? parsed.category : "Other";

    const suggestedActions = Array.isArray(parsed.suggested_actions)
      ? (parsed.suggested_actions as any[]).filter(a => a && typeof a.title === "string").map(a => ({
          title: String(a.title),
          description: a.description ? String(a.description) : undefined,
          deadline: a.deadline && typeof a.deadline === "string" ? a.deadline : null,
          priority: ["low", "medium", "high"].includes(a.priority) ? a.priority : "medium",
          source_evidence: a.source_evidence ? String(a.source_evidence) : undefined,
        }))
      : [];

    return new Response(JSON.stringify({
      available: true,
      extracted: parsed,
      extracted_text: text,
      model: "gemini-2.0-flash",
      confidence: parsed.uncertain ? 0.5 : 0.85,
      category,
      suggested_actions: suggestedActions,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error",
      available: false,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
