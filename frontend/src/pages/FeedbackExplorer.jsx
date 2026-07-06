import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import UrgencyBadge from "../components/UrgencyBadge";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

const ZONES = ["", "Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F"];
const CATEGORIES = ["", "road", "water", "sanitation", "electricity", "safety", "transports"];
const STATUSES = ["", "new", "reviewed", "resolved"];

const selectClass =
  "bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer hover:border-white/20";

export default function FeedbackExplorer() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    zone: "",
    category: "",
    status: "",
    min_urgency: "",
    sort_by: "priority_score",
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = { ...filters, page, page_size: 20 };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    api.feedback(params)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(data.total / 20);

  const SENTIMENT_COLOR = {
    negative: "text-red-400",
    neutral: "text-slate-400",
    positive: "text-emerald-400",
  };

  const CATEGORY_PILL = {
    road: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    water: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    sanitation: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    electricity: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    safety: "bg-red-500/20 text-red-300 border-red-500/30",
    transports: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Feedback Explorer</h2>
        <p className="text-slate-400 text-sm tracking-wide">Browse and filter all processed citizen feedback</p>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Filter size={16} className="text-blue-400" />
          </div>
          <span className="font-semibold text-white tracking-wide">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            className={selectClass}
            value={filters.zone}
            onChange={(e) => { setFilters((f) => ({ ...f, zone: e.target.value })); setPage(1); }}
          >
            {ZONES.map((z) => <option key={z} value={z} className="bg-slate-900 text-slate-200">{z || "All Zones"}</option>)}
          </select>
          <select
            className={selectClass}
            value={filters.category}
            onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value })); setPage(1); }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900 text-slate-200">{c ? c.charAt(0).toUpperCase() + c.slice(1) : "All Categories"}</option>)}
          </select>
          <select
            className={selectClass}
            value={filters.status}
            onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          >
            {STATUSES.map((s) => <option key={s} value={s} className="bg-slate-900 text-slate-200">{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Statuses"}</option>)}
          </select>
          <select
            className={selectClass}
            value={filters.min_urgency}
            onChange={(e) => { setFilters((f) => ({ ...f, min_urgency: e.target.value })); setPage(1); }}
          >
            <option value="" className="bg-slate-900 text-slate-200">Any Urgency</option>
            <option value="8" className="bg-slate-900 text-slate-200">8+ Critical</option>
            <option value="6" className="bg-slate-900 text-slate-200">6+ High</option>
            <option value="4" className="bg-slate-900 text-slate-200">4+ Medium</option>
          </select>
          <select
            className={selectClass}
            value={filters.sort_by}
            onChange={(e) => { setFilters((f) => ({ ...f, sort_by: e.target.value })); setPage(1); }}
          >
            <option value="priority_score" className="bg-slate-900 text-slate-200">Sort: Priority</option>
            <option value="urgency_score" className="bg-slate-900 text-slate-200">Sort: Urgency</option>
            <option value="submitted_at" className="bg-slate-900 text-slate-200">Sort: Date</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-300">
            <span className="text-white text-base font-bold">{data.total.toLocaleString()}</span>
            <span className="text-slate-400 ml-1">results</span>
            {loading && <span className="text-slate-500 ml-2 text-xs animate-pulse">loading...</span>}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-300 font-medium">{page} / {totalPages || 1}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {data.items.map((item) => (
            <div key={item.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-blue-400 text-sm">{item.zone}</span>
                    <span className="text-slate-600">·</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize ${CATEGORY_PILL[item.category_ai] || "bg-white/10 text-slate-300 border-white/10"}`}>
                      {item.category_ai}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className={`text-xs font-medium capitalize ${SENTIMENT_COLOR[item.sentiment]}`}>
                      {item.sentiment}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">{item.source}</span>
                    <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-semibold tracking-wider uppercase ${
                      item.status === "resolved"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : item.status === "reviewed"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "bg-white/10 text-slate-400 border border-white/10"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[15px] text-slate-200 leading-relaxed line-clamp-2 mb-1">{item.description}</p>
                  {item.reasoning && (
                    <p className="text-xs text-slate-500 italic mb-1">{item.reasoning}</p>
                  )}
                  <p className="text-xs text-slate-500 font-medium">
                    {new Date(item.submitted_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <UrgencyBadge score={item.urgency_score} />
                </div>
              </div>
            </div>
          ))}

          {data.items.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-500 text-sm">No feedback matches your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
