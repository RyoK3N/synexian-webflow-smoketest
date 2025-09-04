"use client";

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";

/** --------------------------
 *  Types & constants
 *  -------------------------- */
type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string; id: string; ts: number };

type Provider = "openai" | "together" | "perplexity" | "groq" | "mistral" | "gemini";

const DEFAULTS: Record<Provider, { model: string; note?: string }> = {
  openai:     { model: "gpt-4o-mini" },
  together:   { model: "meta-llama/Llama-3.1-8B-Instruct-Turbo" },
  perplexity: { model: "llama-3.1-70b-instruct" },
  groq:       { model: "llama3-70b-8192" },
  mistral:    { model: "mistral-large-latest" },
  gemini:     { model: "gemini-1.5-flash" }
};

const PRODUCTS = [
  { name: "NeuroDesigner", hint: "AI UI/UX & doc co-pilot" },
  { name: "Agent Bucks", hint: "Outbound AI agents" },
  { name: "Synexian CS Bot", hint: "Customer support LLM" }
];

const STORAGE_KEY = "synexian.playground.v1";

/** Utility */
const uid = () => Math.random().toString(36).slice(2);

/** --------------------------
 *  Root page
 *  -------------------------- */
export default function Page() {
  /** Settings */
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>(DEFAULTS.openai.model);
  const [system, setSystem] = useState<string>("You are Synexian’s helpful assistant.");

  /** Stateful UI */
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /** Bring-Your-Own-Key (client side, stored locally only) */
  const [useClientKey, setUseClientKey] = useState(false);
  const [clientKey, setClientKey] = useState("");

  /** Layout refs */
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Persist/restore session */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.provider) setProvider(saved.provider);
      if (saved.model) setModel(saved.model);
      if (saved.system) setSystem(saved.system);
      if (Array.isArray(saved.messages)) setMessages(saved.messages);
      if (saved.useClientKey) setUseClientKey(!!saved.useClientKey);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ provider, model, system, messages, useClientKey })
      );
    } catch {}
  }, [provider, model, system, messages, useClientKey]);

  /** Sync default model with provider */
  useEffect(() => {
    setModel(DEFAULTS[provider]?.model || "");
  }, [provider]);

  /** Auto scroll */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /** Actions */
  function resetChat() {
    setMessages([]);
  }

  function append(role: Role, content: string) {
    setMessages((cur) => [...cur, { role, content, id: uid(), ts: Date.now() }]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    // Bootstrap system on first message for better determinism
    const bootstrap: Msg[] = messages.length
      ? messages
      : [{ role: "system", content: system, id: uid(), ts: Date.now() }];

    const next = [...bootstrap, { role: "user", content: text, id: uid(), ts: Date.now() }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // IMPORTANT: absolute path so API is not behind basePath
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          messages: next.map(({ role, content }) => ({ role, content })),
          apiKey: useClientKey ? clientKey : undefined
        })
      });

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

  /** --------------------------
   *  UI
   *  -------------------------- */
  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandDot} />
          <div>
            <div style={styles.brandTitle}>Synexian Playground</div>
            <div style={styles.brandSub}>Webflow Cloud • Next.js 15</div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Provider</div>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            style={styles.select}
          >
            <option value="openai">OpenAI</option>
            <option value="together">Together</option>
            <option value="perplexity">Perplexity</option>
            <option value="groq">Groq</option>
            <option value="mistral">Mistral</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Model</div>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULTS[provider].model}
            style={styles.input}
          />
          <div style={styles.help}>
            Default: <code>{DEFAULTS[provider].model}</code>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>System Prompt</div>
          <textarea
            rows={3}
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            style={styles.textarea}
          />
        </div>

        <div style={styles.section}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useClientKey}
              onChange={(e) => setUseClientKey(e.target.checked)}
            />
            <span>Use my API key (local only)</span>
          </label>
          {useClientKey && (
            <input
              type="password"
              value={clientKey}
              onChange={(e) => setClientKey(e.target.value)}
              placeholder="sk-... / your API key"
              style={{ ...styles.input, marginTop: 8 }}
            />
          )}
          <div style={styles.help}>
            Otherwise the server uses provider keys set in Webflow Cloud → Environment Variables.
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Synexian Products</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRODUCTS.map((p) => (
              <span
                key={p.name}
                title={p.hint}
                style={styles.chip}
                onClick={() => setInput(`Tell me about ${p.name}: ${p.hint}`)}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <button style={styles.ghostBtn} onClick={resetChat}>Clear chat</button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerTitle}>Chat</div>
          <div style={styles.headerSub}>
            {provider} • <code style={{ opacity: 0.9 }}>{model}</code>
          </div>
        </header>

        <section style={styles.transcript} ref={scrollRef}>
          {messages.length === 0 ? (
            <div style={styles.placeholder}>
              Start a conversation — Shift+Enter for newline, Enter to send.
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))
          )}
          {loading && <div style={styles.thinking}>…thinking</div>}
        </section>

        <section style={styles.composer}>
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about Synexian products, or anything else…"
            style={styles.composerInput}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              ...styles.primaryBtn,
              opacity: loading || !input.trim() ? 0.6 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer"
            }}
          >
            Send
          </button>
        </section>
      </main>
    </div>
  );
}

/** --------------------------
 *  Message bubble component
 *  -------------------------- */
function MessageBubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === "user";
  const isSystem = role === "system";
  const label = isUser ? "You" : isSystem ? "System" : "Synexian";

  return (
    <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div
        style={{
          border: "1px solid #2c2c47",
          borderRadius: 12,
          padding: "12px 14px",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          background: isUser ? "#121226" : "#0f1023"
        }}
      >
        {content}
      </div>
    </div>
  );
}

/** --------------------------
 *  Inline styles (playground aesthetic)
 *  -------------------------- */
const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 16,
    height: "calc(100vh - 48px)"
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
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  brandDot: {
    width: 10, height: 10, borderRadius: 999,
    background: "linear-gradient(135deg,#3DCE83,#24c7f8)",
    boxShadow: "0 0 18px rgba(36,199,248,.45)"
  },
  brandTitle: { fontWeight: 700, letterSpacing: 0.3 },
  brandSub: { fontSize: 12, opacity: 0.6 },
  section: { display: "grid", gap: 8 },
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
    padding: "6px 10px", borderRadius: 999, border: "1px solid #2c2c47", cursor: "pointer"
  },
  ghostBtn: {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #2c2c47", background: "transparent", color: "#e7e7ff"
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
