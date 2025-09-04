"use client";
import { useState } from "react";

export default function Page() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>✅ Webflow Cloud + GitHub (Synexian)</h1>
      <p style={{ opacity: 0.85, marginBottom: 16 }}>
        Served from <code>/webapp</code> using Next.js 15 on Webflow Cloud.
      </p>

      <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <p style={{ marginBottom: 10 }}>Tiny client-side test:</p>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer" }}
        >
          Clicks: {count}
        </button>
      </div>
    </main>
  );
}
