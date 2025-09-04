export const runtime = "edge";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

type Body = {
  provider: "openai" | "together" | "perplexity" | "groq" | "mistral" | "gemini";
  model?: string;
  messages: Msg[];
  apiKey?: string;     // optional client-provided key
  baseUrl?: string;    // optional custom base URL for OpenAI-compatible providers
};

// Fallback env lookup (OpenNext/Workers provides env at runtime; we’ll guard for safety)
function env(name: string): string | undefined {
  try { return (process as any)?.env?.[name]; } catch { return undefined; }
}

// Default upstreams / env var names per provider
const PROVIDERS = {
  openai:      { base: "https://api.openai.com",      env: "OPENAI_API_KEY",      path: "/v1/chat/completions" },
  together:    { base: "https://api.together.xyz",    env: "TOGETHER_API_KEY",    path: "/v1/chat/completions" },
  perplexity:  { base: "https://api.perplexity.ai",   env: "PPLX_API_KEY",        path: "/v1/chat/completions" },
  groq:        { base: "https://api.groq.com",        env: "GROQ_API_KEY",        path: "/openai/v1/chat/completions" },
  mistral:     { base: "https://api.mistral.ai",      env: "MISTRAL_API_KEY",     path: "/v1/chat/completions" },
  gemini:      { base: "https://generativelanguage.googleapis.com", env: "GEMINI_API_KEY", path: "" } // special
} as const;

function error(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" }});
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return error(400, "Invalid JSON body");
  }

  const { provider, model, messages, apiKey: clientKey, baseUrl } = body || {};
  if (!provider) return error(400, "Missing 'provider'");
  if (!Array.isArray(messages) || messages.length === 0) return error(400, "Missing 'messages'");

  if (provider === "gemini") {
    // Gemini needs special formatting
    const key = clientKey || env(PROVIDERS.gemini.env);
    if (!key) return error(401, "Missing Gemini API key (provide apiKey in body or set GEMINI_API_KEY in env)");
    const useModel = model || "gemini-1.5-flash";

    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const url = `${PROVIDERS.gemini.base}/v1beta/models/${encodeURIComponent(useModel)}:generateContent`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
      body: JSON.stringify({ contents })
    });

    if (!r.ok) {
      const t = await r.text();
      return error(r.status, `Gemini upstream error: ${t}`);
    }
    const json = await r.json() as any;
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no content)";
    return Response.json({ reply, provider: "gemini", model: useModel });
  }

  // OpenAI-compatible providers
  const p = (PROVIDERS as any)[provider];
  if (!p) return error(400, `Unsupported provider: ${provider}`);

  const key = clientKey || env(p.env);
  if (!key) return error(401, `Missing API key for ${provider} (provide apiKey in body or set ${p.env} in env)`);

  const useModel = model || (
    provider === "openai" ? "gpt-4o-mini" :
    provider === "together" ? "meta-llama/Llama-3.1-8B-Instruct-Turbo" :
    provider === "perplexity" ? "llama-3.1-70b-instruct" :
    provider === "groq" ? "llama3-70b-8192" :
    provider === "mistral" ? "mistral-large-latest" : "gpt-4o-mini"
  );

  const url = `${(baseUrl || p.base)}${p.path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: useModel,
      messages,
      temperature: 0.7
    })
  });

  if (!r.ok) {
    const t = await r.text();
    return error(r.status, `${provider} upstream error: ${t}`);
  }

  const json = await r.json() as any;
  const reply =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    "(no content)";

  return Response.json({ reply, provider, model: useModel });
}
