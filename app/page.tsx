"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const defaultForm = {
  businessName: "Example Repair Co.",
  service: "Phone Screen Repair",
  city: "Sampletown, CA",
  targetAudience: "busy students and working professionals",
  primaryKeyword: "phone screen repair sampletown",
  secondaryKeywords: "same-day screen repair, cracked screen fix, affordable phone repair",
  tone: "friendly, clear, professional",
  cta: "Get a free quote",
};

const MODEL_OPTIONS = {
  openai: [
    { value: "gpt-4.1-mini", label: "gpt-4.1-mini (fast/cheap)" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini (multimodal)" },
  ],
  gemini: [
    { value: "gemini-2.5-flash", label: "gemini-2.5-flash (fast)" },
    { value: "gemini-2.5-pro", label: "gemini-2.5-pro (strong)" },
  ],
} as const;

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(""); // default blank

  const outputRef = useRef<HTMLDivElement | null>(null);

  // Load/save key per provider
  useEffect(() => {
    const saved = localStorage.getItem(`seoai_key_${provider}`) || "";
    setApiKey(saved);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem(`seoai_key_${provider}`, apiKey);
  }, [provider, apiKey]);

  // Clear model when provider changes (default stays blank)
  useEffect(() => {
    setModel("");
  }, [provider]);

  const canGenerate = useMemo(() => {
    return (
      form.businessName.trim() &&
      form.service.trim() &&
      form.city.trim() &&
      form.primaryKeyword.trim()
    );
  }, [form]);

  async function handleGenerate() {
    if (!canGenerate || loading) return;

    if (!apiKey.trim()) {
      setError("Paste your API key first.");
      return;
    }
    if (!model.trim()) {
      setError("Select a model first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          provider,
          apiKey,
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "API request failed");
        setResult(null);
        return;
      }

      setResult(data);
    } catch (e) {
      setError("Something went wrong. Try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function downloadHtml(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-scroll to output after generation
  useEffect(() => {
    if (result && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>AI SEO Website Generator (MVP)</h1>
        <p style={styles.heroP}>
          Fill in business context → generate an SEO-optimized HTML page + schema.
        </p>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Inputs</h2>

          <label style={styles.field}>
            <div style={styles.label}>AI provider</div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              style={{ ...styles.input, height: 42 }}
            >
              <option value="openai">GPT (OpenAI)</option>
              <option value="gemini">Gemini (Google)</option>
            </select>
          </label>

          <label style={styles.field}>
            <div style={styles.label}>API key (saved in your browser)</div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={styles.input}
              placeholder={provider === "openai" ? "sk-..." : "AIza..."}
            />
          </label>

          <label style={styles.field}>
            <div style={styles.label}>Model</div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ ...styles.input, height: 42 }}
            >
              <option value="">Select a model…</option>
              {MODEL_OPTIONS[provider].map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <div style={styles.helper}>
              Pick a model for {provider === "openai" ? "GPT (OpenAI)" : "Gemini (Google)"}.
            </div>
          </label>

          <Field
            label="Business name"
            value={form.businessName}
            onChange={(v) => setForm({ ...form, businessName: v })}
          />
          <Field
            label="Service"
            value={form.service}
            onChange={(v) => setForm({ ...form, service: v })}
          />
          <Field
            label="City"
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
          />
          <Field
            label="Target audience"
            value={form.targetAudience}
            onChange={(v) => setForm({ ...form, targetAudience: v })}
          />
          <Field
            label="Primary keyword"
            value={form.primaryKeyword}
            onChange={(v) => setForm({ ...form, primaryKeyword: v })}
          />
          <Field
            label="Secondary keywords (comma-separated)"
            value={form.secondaryKeywords}
            onChange={(v) => setForm({ ...form, secondaryKeywords: v })}
          />
          <Field
            label="Tone"
            value={form.tone}
            onChange={(v) => setForm({ ...form, tone: v })}
          />
          <Field
            label="CTA"
            value={form.cta}
            onChange={(v) => setForm({ ...form, cta: v })}
          />

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            style={{
              ...styles.button,
              opacity: !canGenerate || loading ? 0.6 : 1,
              cursor: !canGenerate || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate SEO Page"}
          </button>

          {error ? <p style={{ ...styles.p, color: "crimson" }}>{error}</p> : null}

          <p style={styles.small}>
            Tip: you can paste the generated HTML into any CMS page editor.
          </p>
        </section>

        <section ref={outputRef} style={styles.card}>
          <h2 style={styles.h2}>Output</h2>

          {!result ? (
            <p style={styles.p}>Generate to see your meta + HTML + schema here.</p>
          ) : (
            <>
              <div style={styles.outputRow}>
                <div>
                  <div style={styles.label}>Meta title</div>
                  <div style={styles.mono}>{result.metaTitle}</div>
                </div>
                <div>
                  <div style={styles.label}>Meta description</div>
                  <div style={styles.mono}>{result.metaDescription}</div>
                </div>
              </div>

              {result.seoScore ? (
                <div style={{ marginBottom: 12, fontSize: 12, color: "#555" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>SEO checks</div>
                  <div>
                    Title length: {result.seoScore.titleLength} (
                    {result.seoScore.checks.titleOk ? "OK" : "Fix"})
                  </div>
                  <div>
                    Description length: {result.seoScore.descriptionLength} (
                    {result.seoScore.checks.descOk ? "OK" : "Fix"})
                  </div>
                  <div>
                    H1 length: {result.seoScore.checks.h1Ok ? "OK" : "Fix"}
                  </div>
                </div>
              ) : null}

              <div style={styles.actions}>
                <button style={styles.secondaryBtn} onClick={() => copyToClipboard(result.html)}>
                  Copy HTML
                </button>
                <button
                  style={styles.secondaryBtn}
                  onClick={() => copyToClipboard(result.schemaJsonLd)}
                >
                  Copy JSON-LD Schema
                </button>
                <button
                  style={styles.secondaryBtn}
                  onClick={() => downloadHtml("seo-page.html", result.html)}
                >
                  Download HTML
                </button>
              </div>

              <div style={styles.previewWrap}>
                <div style={styles.label}>Live preview</div>
                <div style={styles.preview} dangerouslySetInnerHTML={{ __html: result.html }} />
              </div>

              <details style={styles.details}>
                <summary style={styles.summary}>Show raw HTML</summary>
                <pre style={styles.pre}>{result.html}</pre>
              </details>

              <details style={styles.details}>
                <summary style={styles.summary}>Show JSON-LD schema</summary>
                <pre style={styles.pre}>{result.schemaJsonLd}</pre>
              </details>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={styles.field}>
      <div style={styles.label}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
        placeholder={label}
      />
    </label>
  );
}

const styles: any = {
  page: {
    padding: 24,
    fontFamily: "system-ui, Arial",
    maxWidth: 900,
    margin: "0 auto",
  },
  header: { marginBottom: 16 },
  h1: { fontSize: 28, margin: 0 },
  h2: { fontSize: 18, marginTop: 0 },
  p: { marginTop: 8, color: "#475569" },
  heroP: { marginTop: 8, color: "rgba(248,250,252,0.75)" },
  small: { marginTop: 10, color: "#666", fontSize: 12 },
  helper: { fontSize: 12, color: "#666", marginTop: 4 },

  grid: { display: "grid", gap: 16, gridTemplateColumns: "1fr" },

  card: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    color: "#0f172a",
  },

  field: { display: "block", marginBottom: 10 },
  label: { fontSize: 12, color: "#555", marginBottom: 4 },
  input: { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" },

  button: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "none",
    fontWeight: 700,
    background: "black",
    color: "white",
    marginTop: 8,
  },

  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "white",
    fontWeight: 600,
  },

  actions: { display: "flex", gap: 10, marginTop: 10, marginBottom: 10, flexWrap: "wrap" },

  outputRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 12,
  },

  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    background: "#f7f7f7",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #eee",
  },

  previewWrap: { marginTop: 10 },
  preview: { border: "1px solid #eee", borderRadius: 12, padding: 16, background: "#fafafa" },

  details: { marginTop: 10 },
  summary: { cursor: "pointer", fontWeight: 700 },

  pre: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    background: "#0b0b0b",
    color: "white",
    padding: 12,
    borderRadius: 12,
    overflowX: "auto",
    fontSize: 12,
  },
};
