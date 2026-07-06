import { useEffect, useState } from "react";
import { api } from "../api";
import { AlertTriangle, TrendingUp, Zap } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { cls: "bg-red-100 border-red-400 text-red-800", badge: "bg-red-600 text-white" },
  high: { cls: "bg-orange-100 border-orange-400 text-orange-800", badge: "bg-orange-500 text-white" },
  medium: { cls: "bg-yellow-100 border-yellow-400 text-yellow-800", badge: "bg-yellow-500 text-white" },
};

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.anomalies()
      .then(setAnomalies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 py-12 text-center">Detecting anomalies...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Anomaly Alerts</h2>
        <p className="text-gray-500 text-sm">
          Spikes detected by comparing current 7-day window vs prior 7-day baseline
        </p>
      </div>

      {anomalies.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <TrendingUp className="mx-auto mb-3 text-green-500" size={40} />
          <h3 className="text-lg font-bold text-green-800">No anomalies detected</h3>
          <p className="text-green-700 text-sm mt-1">All zones are within normal ranges.</p>
        </div>
      ) : (
        <>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <strong className="text-red-800">{anomalies.length} anomalies detected</strong>
              <p className="text-red-700 text-sm mt-0.5">
                These zones/categories show unusual complaint spikes requiring immediate attention.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {anomalies.map((a, i) => {
              const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium;
              return (
                <div
                  key={i}
                  className={`rounded-xl border-2 p-5 ${cfg.cls}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${cfg.badge}`}>
                          {a.severity}
                        </span>
                        <span className="font-bold text-lg">{a.zone}</span>
                        <span className="text-gray-500">·</span>
                        <span className="font-semibold capitalize">{a.category.replace("_", " ")}</span>
                      </div>
                      <div className="text-sm opacity-80">
                        Avg urgency score: <strong>{a.avg_urgency}/10</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black">{a.spike_ratio}×</div>
                      <div className="text-xs font-medium opacity-70">spike ratio</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{a.current_count}</div>
                      <div className="text-xs opacity-70">Last 7 days</div>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{a.prior_count}</div>
                      <div className="text-xs opacity-70">Prior 7 days</div>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">+{((a.spike_ratio - 1) * 100).toFixed(0)}%</div>
                      <div className="text-xs opacity-70">Increase</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs opacity-70 flex items-center gap-1">
                    <Zap size={12} />
                    Requires immediate review — complaints above {a.spike_ratio}× baseline
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
