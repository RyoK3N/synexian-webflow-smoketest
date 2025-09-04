"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { BASE_PATH, apiUrl } from "../lib/paths";

/* ──────────────────────────────────────────────────────────────────────────────
 * Types & constants
 * ────────────────────────────────────────────────────────────────────────────── */
type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string; id: string; ts: number };

type Provider = "openai" | "together" | "perplexity" | "groq" | "mistral" | "gemini";

const DEFAULTS: Record<Provider, { model: string; hint?: string }> = {
  openai:     { model: "gpt-4o-mini", hint: "Fast + multimodal" },
  together:   { model: "meta-llama/Llama-3.1-8B-Instruct-Turbo", hint: "Open-source 8B" },
  perplexity: { model: "llama-3.1-70b-instruct", hint: "Strong RAG/search" },
  groq:       { model: "llama3-70b-8192", hint: "Low-latency" },
  mistral:    { model: "mistral-large-latest", hint: "EU-friendly" },
  gemini:     { model: "gemini-1.5-flash", hint: "Great on long/context" }
};

const PRODUCTS = [
  { name: "NeuroDesigner", hint: "AI UI/UX & doc co-pilot" },
  { name: "Agent Bucks", hint: "Outbound AI agents" },
  { name: "Synexian CS Bot", hint: "Customer support LLM" }
];

const STORAGE_KEY = "synexian.playground.v1";

/* ──────────────────────────────────────────────────────────────────────────────
 * Utilities
 * ────────────────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ──────────────────────────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────────────────────────── */
export default function Page() {
  /* Settings */
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>(DEFAULTS.openai.model);
  const [system, setSystem] = useState<string>("You are Synexian’s helpful assistant.");

  /* Chat state */
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

  /* Bring-Your-Own-Key (local only; never sent to storage) */
  const [useClientKey, setUseClientKey] = useState(true);
  const [clientKey, setClientKey] = useState("");

  /* UI helpers */
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Restore persisted session */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.provider) setProvider(saved.provider);
      if (saved.model) setModel(saved.model);
      if (saved.system) setSystem(saved.system);
      if (Array.isArray(saved.messages)) setMessages(saved.messages);
      if (typeof saved.temperature === "number") setTemperature(clamp(saved.temperature, 0, 1));
      if (saved.useClientKey !== undefined) setUseClientKey(!!saved.useClientKey);
    } catch {}
  }, []);

  /* Persist session (never store key) */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ provider, model, system, messages, temperature, useClientKey })
      );
    } catch {}
  }, [provider, model, system, messages, temperature, useClientKey]);

  /* Sync default model on provider change */
  useEffect(() => {
    setModel(DEFAULTS[provider]?.model || "");
  }, [provider]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function resetChat() {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  function append(role: Role, content: string) {
    const entry: Msg = { role, content, id: uid(), ts: Date.now() };
    setMessages((cur) => [...cur, entry]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    if (useClientKey && !clientKey.trim()) {
      append("assistant", "⚠️ Please add your API key in the sidebar to send messages.");
      return;
    }

    /* Bootstrap system on first user message */
    const bootstrap: Msg[] =
      messages.length > 0
        ? messages
        : [{ role: "system" as Role, content: system, id: uid(), ts: Date.now() }];

    const userMsg: Msg = { role: "user", content: text, id: uid(), ts: Date.now() };
    const next: Msg[] = [...bootstrap, userMsg];

    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s budget

      // IMPORTANT: use base path so API route resolves behind mount path (e.g. /webapp/api/chat)
      const res = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          provider,
          model,
          temperature,
          messages: next.map(({ role, content }) => ({ role, content })),
          apiKey: useClientKey ? clientKey : undefined
        })
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const reply: string = data?.reply ?? "(no reply)";
      append("assistant", reply);
    } catch (e: any) {
      append("assistant", `⚠️ Error: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  /* ─ UI ─ */
  return (
    <div style={sx.page}>
      <nav style={sx.nav}>
        <div style={sx.navLeft}>
          <div style={sx.brandMark} />
          <div style={{ display: "grid", lineHeight: 1 }}>
            <div style={sx.brandTitle}>Synexian Playground</div>
            <div style={sx.brandSub}>Mounted at <code>{BASE_PATH || "/"}</code></div>
          </div>
        </div>
        <div style={sx.navRight}>
          <button style={sx.ghostSm} onClick={() => resetChat()}>New Chat</button>
        </div>
      </nav>

      <div style={sx.shell}>
        {/* Sidebar */}
        <aside style={sx.sidebar}>
          <div style={sx.block}>
            <div style={sx.label}>Provider</div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              style={sx.select}
            >
              <option value="openai">OpenAI</option>
              <option value="together">Together</option>
              <option value="perplexity">Perplexity</option>
              <option value="groq">Groq</option>
              <option value="mistral">Mistral</option>
              <option value="gemini">Gemini</option>
            </select>
            <div style={sx.help}>{DEFAULTS[provider].hint}</div>
          </div>

          <div style={sx.block}>
            <div style={sx.label}>Model</div>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULTS[provider].model}
              style={sx.input}
            />
            <div style={sx.help}>Default: <code>{DEFAULTS[provider].model}</code></div>
          </div>

          <div style={sx.block}>
            <div style={sx.label}>Temperature: {temperature.toFixed(2)}</div>
            <input
              type="range"
              step="0.01"
              min="0"
              max="1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
            <div style={sx.help}>Lower → precise • Higher → creative</div>
          </div>

          <div style={sx.block}>
            <div style={sx.label}>System Prompt</div>
            <textarea
              rows={3}
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              style={sx.textarea}
            />
          </div>

          <div style={sx.block}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={useClientKey}
                onChange={(e) => setUseClientKey(e.target.checked)}
              />
              <span>Use my API key (stored locally)</span>
            </label>
            {useClientKey && (
              <input
                type="password"
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                placeholder="sk-... / your API key"
                style={{ ...sx.input, marginTop: 8 }}
              />
            )}
            <div style={sx.help}>
              The API key is sent only with your request to the server route and never persisted.
            </div>
          </div>

          <div style={sx.block}>
            <div style={sx.label}>Synexian Products</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRODUCTS.map((p) => (
                <button
                  key={p.name}
                  title={p.hint}
                  style={sx.chip}
                  onClick={() => setInput(`Tell me about ${p.name}: ${p.hint}`)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
            <button style={sx.ghostBtn} onClick={resetChat}>Clear chat</button>
            <button style={sx.ghostBtn} onClick={() => inputRef.current?.focus()}>Focus input</button>
          </div>
        </aside>

        {/* Main */}
        <main style={sx.main}>
          <header style={sx.header}>
            <div style={sx.headerTitle}>Chat</div>
            <div style={sx.headerSub}>
              {provider} • <code style={{ opacity: 0.9 }}>{model}</code>
            </div>
          </header>

          <section style={sx.transcript} ref={scrollRef}>
            {messages.length === 0 ? (
              <div style={sx.placeholder}>
                Start a conversation — <kbd>Enter</kbd> to send • <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
              </div>
            ) : (
              messages.map((m) => <Bubble key={m.id} msg={m} />)
            )}
            {loading && <div style={sx.thinking}>…thinking</div>}
          </section>

          <section style={sx.composer}>
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about Synexian products, or anything else…"
              style={sx.composerInput}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                ...sx.primaryBtn,
                opacity: loading || !input.trim() ? 0.6 : 1,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer"
              }}
              aria-label="Send message"
            >
              Send
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Message bubble
 * ────────────────────────────────────────────────────────────────────────────── */
function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  const label = isUser ? "You" : isSystem ? "System" : "Synexian";

  return (
    <article style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div
        style={{
          border: "1px solid #2c2c47",
          borderRadius: 12,
          padding: "12px 14px",
          background: isUser ? "#141533" : "#0f1026",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6
        }}
      >
        {msg.content}
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────────────────── */
const sx: Record<string, React.CSSProperties> = {
  page: {
    display: "grid",
    gridTemplateRows: "auto 1fr",
    minHeight: "100vh",
    background: "radial-gradient(1200px 500px at 10% -10%, rgba(61,206,131,0.08), transparent), radial-gradient(1200px 500px at 90% -20%, rgba(36,199,248,0.08), transparent), #08091a",
    color: "#e7e7ff"
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #2c2c47",
    padding: "10px 14px",
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(10,11,27,0.8)",
    backdropFilter: "blur(6px)"
  },
  navLeft: { display: "flex", alignItems: "center", gap: 10 },
  navRight: { display: "flex", gap: 8 },
  brandMark: {
    width: 12, height: 12, borderRadius: 999,
    background: "linear-gradient(135deg,#3DCE83,#24c7f8)",
    boxShadow: "0 0 18px rgba(36,199,248,.45)"
  },
  brandTitle: { fontWeight: 700, letterSpacing: 0.3 },
  brandSub: { fontSize: 12, opacity: 0.6 },
  ghostSm: {
    padding: "6px 10px", borderRadius: 8, border: "1px solid #2c2c47", background: "transparent", color: "#e7e7ff"
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 16,
    height: "calc(100vh - 56px)",
    padding: 16
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    border: "1px solid #2c2c47",
    borderRadius: 14,
    padding: 14,
    background: "linear-gradient(180deg,#0e0f22,#0a0b1b)"
  },
  block: { display: "grid", gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  select: {
    padding: 10, borderRadius: 10, background: "#121226", color: "#fff", border: "1px solid #2c2c47"
  },
  input: {
    padding: 10, borderRadius: 10, background: "#121226", color: "#fff", border: "1px solid #2c2c47"
  },
  textarea: {
    padding: 10, borderRadius: 10, background: "#121226", color: "#fff", border: "1px solid #2c2c47", resize: "vertical"
  },
  help: { fontSize: 11, opacity: 0.6 },
  chip: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #2c2c47",
    background: "transparent",
    color: "#e7e7ff",
    cursor: "pointer"
  },
  ghostBtn: {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #2c2c47", background: "transparent", color: "#e7e7ff"
  },
  main: {
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    border: "1px solid #2c2c47",
    borderRadius: 14,
    background: "linear-gradient(180deg,#0c0d1f,#0a0b1b)"
  },
  header: {
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
    padding: "14px 16px", borderBottom: "1px solid #2c2c47"
  },
  headerTitle: { fontWeight: 600 },
  headerSub: { fontSize: 12, opacity: 0.7 },
  transcript: {
    padding: "14px 16px", overflow: "auto"
  },
  placeholder: { opacity: 0.6, fontSize: 14, padding: "8px 0" },
  thinking: { opacity: 0.6, padding: "8px 0" },
  composer: {
    display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: 12, borderTop: "1px solid #2c2c47"
  },
  composerInput: {
    padding: 12, borderRadius: 10, background: "#121226", color: "#fff", border: "1px solid #2c2c47", resize: "vertical"
  },
  primaryBtn: {
    padding: "12px 18px",
    borderRadius: 10,
    background: "linear-gradient(135deg,#3DCE83,#24c7f8)",
    color: "#0b0b16",
    fontWeight: 700,
    border: "1px solid #2c2c47"
  }
};
