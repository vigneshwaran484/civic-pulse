import { useEffect, useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid,
} from "recharts";
import { api } from "../api";
import StatCard from "../components/StatCard";
import { Activity, AlertTriangle, TrendingUp, Zap } from "lucide-react";

const CATEGORY_COLORS = {
  road: "#f59e0b",
  water: "#3b82f6",
  sanitation: "#10b981",
  electricity: "#8b5cf6",
  transports: "#ec4899",
  safety: "#ef4444",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [aggregates, setAggregates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.anomalies(), api.aggregates({ days: 30 })])
      .then(([s, a, agg]) => {
        setStats(s);
        setAnomalies(a);
        setAggregates(agg);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build trend data: group aggregates by date, sum counts
  const trendData = (() => {
    const byDate = {};
    aggregates.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, total: 0 };
      byDate[r.date].total += r.count;
      byDate[r.date][r.zone] = (byDate[r.date][r.zone] || 0) + r.count;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const zones = [...new Set(aggregates.map((r) => r.zone))].sort();
  const ZONE_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (!stats || stats.total_processed === 0) {
    return (
      <div className="glass-panel border-yellow-500/30 rounded-2xl p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-yellow-500/5"></div>
        <Zap className="mx-auto mb-4 text-yellow-400 relative z-10" size={48} />
        <h2 className="text-2xl font-bold text-yellow-300 mb-3 relative z-10">No data yet</h2>
        <p className="text-yellow-200/80 mb-4 relative z-10 text-lg">
          Go to the <strong className="text-yellow-100">Setup</strong> tab to load synthetic data and run AI processing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">City Overview</h2>
        <p className="text-slate-400 text-sm tracking-wide">Live civic feedback intelligence — last 30 days</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Feedback"
          value={stats.total_feedback?.toLocaleString()}
          subtitle="All-time submissions"
          color="blue"
          icon={Activity}
        />
        <StatCard
          title="AI Processed"
          value={stats.total_processed?.toLocaleString()}
          subtitle="Classified by Gemini"
          color="green"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Urgency"
          value={stats.avg_urgency}
          subtitle="Out of 10"
          color={stats.avg_urgency >= 6 ? "red" : stats.avg_urgency >= 4 ? "orange" : "green"}
          icon={Zap}
        />
        <StatCard
          title="Active Anomalies"
          value={anomalies.length}
          subtitle="Spike alerts detected"
          color={anomalies.length > 0 ? "red" : "green"}
          icon={AlertTriangle}
        />
      </div>

      {/* Anomaly alert banner */}
      {anomalies.length > 0 && (
        <div className="glass-panel border-red-500/40 bg-red-500/10 rounded-2xl p-5 shadow-[0_0_20px_rgba(239,68,68,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-400" size={24} />
            <span className="font-bold text-red-100 text-lg">
              {anomalies.length} Anomaly Alert{anomalies.length > 1 ? "s" : ""} Detected
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {anomalies.slice(0, 3).map((a, i) => (
              <span
                key={i}
                className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide"
              >
                {a.zone} · {a.category.replace("_", " ")} · {a.spike_ratio}x spike
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <h3 className="font-bold text-white mb-6 tracking-wide">Feedback by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.category_breakdown} margin={{ left: -10 }}>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.replace("_", " ")}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => [v, n.replace("_", " ")]} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}
                label={false}
              >
                {stats.category_breakdown.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={CATEGORY_COLORS[entry.category] || "#6b7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Breakdown */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          <h3 className="font-bold text-white mb-6 tracking-wide">Feedback by Zone</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.zone_breakdown} margin={{ left: -10 }}>
              <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend chart */}
      {trendData.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <h3 className="font-bold text-white mb-6 tracking-wide">Daily Feedback Trend by Zone (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                interval={4}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {zones.map((z, i) => (
                <Line
                  key={z}
                  type="monotone"
                  dataKey={z}
                  stroke={ZONE_COLORS[i % ZONE_COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
