"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Simple Synexian chips (you can wire these to real pages later)
const products = [
  { name: "NeuroDesigner", hint: "AI UI/UX & doc co-pilot" },
  { name: "Agent Bucks", hint: "Outbound AI agents" },
  { name: "Synexian CS Bot", hint: "Customer support LLM" }
];

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

type Provider = "openai" | "together" | "perplexity" | "groq" | "mistral" | "gemini";

const DEFAULTS: Record<Provider, { model: string; note?: string }> = {
  openai: { model: "gpt-4o-mini" },
  together: { model: "meta-llama/Llama-3.1-8B-Instruct-Turbo" },
  perplexity: { model: "llama-3.1-70b-instruct" },
  groq: { model: "llama3-70b-8192" },
  mistral: { model: "mistral-large-latest" },
  gemini: { model: "gemini-1.5-flash" }
};

export default function Page() {
  // UI state
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>(DEFAULTS.openai.model);
  const [system, setSystem] = useState<string>("You are Synexian’s helpful assistant.");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Optional: BYOK (bring your own key) if server env isn’t set
  const [useClientKey, setUseClientKey] = useState(false);
  const [clientKey, setClientKey] = useState<string>("");

  // Persist small settings in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("synexian.chat.settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.provider) setProvider(s.provider);
        if (s.model) setModel(s.model);
        if (s.system) setSystem(s.system);
        if (s.useClientKey) setUseClientKey(!!s.useClientKey);
        if (s.clientKey) setClientKey(s.clientKey);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "synexian.chat.settings",
        JSON.stringify({ provider, model, system, useClientKey, clientKey: useClientKey ? clientKey : "" })
      );
    } catch {}
  }, [provider, model, system, useClientKey, clientKey]);

  // Auto-set default model on provider change if user hasn’t typed a custom one
  useEffect(() => {
    const d = DEFAULTS[provider]?.model;
    if (d) setModel(d);
  }, [provider]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const trim = input.trim();
    if (!trim || loading) return;

    const nextMsgs = [
      ...(messages.length ? messages : [{ role: "system" as Role, content: system }]),
      { role: "user" as Role, content: trim }
    ];
    setMessages(nextMsgs);
    setInput("");
    setLoading(true);

    try {
      // IMPORTANT: relative path without leading slash respects basePath (/webapp)
      const res = await fetch("api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          messages: nextMsgs,
          apiKey: useClientKey ? clientKey : undefined
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const reply: string = data?.reply ?? "(no reply)";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ Error: ${e?.message || "Unknown error"}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Header / Products */}
      <header style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, margin: 0, letterSpacing: 0.2 }}>
          Synexian Chat • <span style={{ opacity: 0.7 }}>Multi-Provider</span>
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          {products.map((p) => (
            <span key={p.name} title={p.hint}
              style={{ padding: "6px 10px", border: "1px solid #2c2c47", borderRadius: 999, fontSize: 12, opacity: 0.9 }}>
              {p.name}
            </span>
          ))}
        </div>
      </header>

      {/* Settings */}
      <section style={{ padding: 12, border: "1px solid #2c2c47", borderRadius: 12, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              style={{ padding: 10, borderRadius: 8, background: "#121226", color: "white", border: "1px solid #2c2c47" }}
            >
              <option value="openai">OpenAI</option>
              <option value="together">Together</option>
              <option value="perplexity">Perplexity</option>
              <option value="groq">Groq</option>
              <option value="mistral">Mistral</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Model</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULTS[provider].model}
              style={{ padding: 10, borderRadius: 8, background: "#121226", color: "white", border: "1px solid #2c2c47" }}
            />
          </label>

          <label style={{ gridColumn: "1 / span 2", display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>System Prompt</span>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={2}
              style={{ padding: 10, borderRadius: 8, background: "#121226", color: "white", border: "1px solid #2c2c47", resize: "vertical" }}
            />
          </label>
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useClientKey}
              onChange={(e) => setUseClientKey(e.target.checked)}
            />
            <span style={{ fontSize: 13, opacity: 0.85 }}>Use my API key (stored in this browser only)</span>
          </label>

          {useClientKey && (
            <input
              type="password"
              value={clientKey}
              onChange={(e) => setClientKey(e.target.value)}
              placeholder="sk-... / your-api-key"
              style={{ flex: 1, minWidth: 280, padding: 10, borderRadius: 8, background: "#121226", color: "white", border: "1px solid #2c2c47" }}
            />
          )}
        </div>

        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
          Tip: If you don’t use a client key, the app will try provider keys from the server environment
          (set in Webflow Cloud → Environment Variables).
        </p>
      </section>

      {/* Chat list */}
      <section style={{ height: 420, overflow: "auto", border: "1px solid #2c2c47", borderRadius: 12, padding: 12, marginBottom: 12 }} ref={listRef}>
        {messages.length === 0 ? (
          <div style={{ opacity: 0.6, fontSize: 14 }}>Start a conversation — your messages will appear here.</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 4 }}>
                {m.role === "user" ? "You" : m.role === "assistant" ? "Synexian" : "System"}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
            </div>
          ))
        )}
        {loading && <div style={{ opacity: 0.6 }}>…thinking</div>}
      </section>

      {/* Composer */}
      <section style={{ display: "flex", gap: 8 }}>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Synexian products, or anything else…"
          style={{ flex: 1, padding: 12, borderRadius: 10, background: "#121226", color: "white", border: "1px solid #2c2c47", resize: "vertical" }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "linear-gradient(135deg,#3DCE83,#24c7f8)",
            color: "#0b0b16",
            fontWeight: 600,
            border: "1px solid #2c2c47",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            minWidth: 96
          }}
        >
          Send
        </button>
      </section>
    </main>
  );
}
