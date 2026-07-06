const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  health: () => req("/health"),
  ingest: (useSynthetic = true) =>
    req(`/ingest?use_synthetic=${useSynthetic}`, { method: "POST" }),
  process: (limit = 50) => req(`/process?limit=${limit}`, { method: "POST" }),
  stats: () => req("/stats"),
  anomalies: () => req("/anomalies"),
  aggregates: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/aggregates${q ? "?" + q : ""}`);
  },
  feedback: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    return req(`/feedback${q ? "?" + q : ""}`);
  },
  ask: (question) =>
    req("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
  reset: () => req("/reset", { method: "POST" }),
};
