import { useState } from "react";
import { api } from "../api";
import UrgencyBadge from "../components/UrgencyBadge";
import { MessageSquare, Send, Loader, Lightbulb } from "lucide-react";

const SAMPLE_QUESTIONS = [
  "What are the top 5 urgent issues in Zone B this week?",
  "Which zone has the most water supply complaints?",
  "Show me critical safety issues across all zones",
  "What are the highest priority unresolved complaints?",
  "Which categories have the most complaints in the last 7 days?",
  "Are there any critical pothole issues in Zone A?",
];

export default function AskCivicPulse() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (q) => {
    const qText = q || question;
    if (!qText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.ask(qText);
      setResult(res);
      setQuestion(qText);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Ask Civic Pulse</h2>
        <p className="text-slate-400 text-sm tracking-wide">
          Ask plain-English questions about civic feedback — powered by Gemini AI
        </p>
      </div>

      {/* Query Box */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <MessageSquare className="text-blue-400" size={20} />
          </div>
          <span className="font-semibold text-white tracking-wide">Ask a question</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
            placeholder="e.g. What are the most urgent issues in Zone B this week?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={loading}
          />
          <button
            onClick={() => submit()}
            disabled={loading || !question.trim()}
            className="btn-primary px-6 py-3.5 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>

        {/* Sample questions */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <Lightbulb size={12} className="text-yellow-400" />
            Try these:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => { setQuestion(q); submit(q); }}
                disabled={loading}
                className="bg-white/5 border border-white/10 text-slate-300 px-4 py-1.5 rounded-full text-xs hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Error: {error}. Make sure the API is running and GEMINI_API_KEY is set.
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* AI Answer */}
          <div className="glass-panel border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/10"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-3 shadow-lg flex-shrink-0">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2 text-sm uppercase tracking-widest">
                  AI Analysis
                </div>
                <p className="text-slate-200 leading-relaxed text-[15px]">{result.answer}</p>
              </div>
            </div>
          </div>

          {/* Query interpretation */}
          {result.intent && (
            <div className="glass-panel border-white/5 rounded-xl px-5 py-3 text-sm text-slate-400 flex flex-wrap gap-2 items-center">
              <strong className="text-slate-300">Query interpreted as:</strong>
              {result.intent.zone && <span className="bg-white/5 px-2 py-0.5 rounded">Zone: {result.intent.zone}</span>}
              {result.intent.category && <span className="bg-white/5 px-2 py-0.5 rounded">Cat: {result.intent.category}</span>}
              {result.intent.time_range && <span className="bg-white/5 px-2 py-0.5 rounded">Time: {result.intent.time_range.replace(/_/g, ' ')}</span>}
              {result.intent.sort_by && <span className="bg-white/5 px-2 py-0.5 rounded">Sort: {result.intent.sort_by.replace(/_/g, ' ')}</span>}
            </div>
          )}

          {/* Supporting data */}
          {result.data && result.data.length > 0 && (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                <span className="font-bold text-white tracking-wide">Supporting Data</span>
                <span className="text-slate-400 text-sm ml-2 font-medium">({result.data.length} records)</span>
              </div>
              <div className="divide-y divide-white/10">
                {result.data.map((item, i) => (
                  <div key={i} className="px-6 py-4 hover:bg-white/5 transition-colors flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-semibold text-blue-400 text-sm">{item.zone}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-sm text-slate-300 capitalize font-medium">
                          {item.category_ai?.replace("_", " ")}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold tracking-wider uppercase ${
                          item.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : item.status === "reviewed"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-white/10 text-slate-300 border border-white/10"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[15px] text-slate-200 leading-relaxed mb-2">{item.description}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(item.submitted_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                        })}
                        {" · "}Priority: {item.priority_score}
                      </p>
                    </div>
                    <UrgencyBadge score={item.urgency_score} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
