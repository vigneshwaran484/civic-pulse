export default function StatCard({ title, value, subtitle, color = "blue", icon: Icon }) {
  const colors = {
    blue: "from-blue-500/10 to-blue-900/10 border-blue-500/20 text-blue-400",
    red: "from-red-500/10 to-red-900/10 border-red-500/20 text-red-400",
    orange: "from-orange-500/10 to-orange-900/10 border-orange-500/20 text-orange-400",
    green: "from-green-500/10 to-green-900/10 border-green-500/20 text-green-400",
    purple: "from-purple-500/10 to-purple-900/10 border-purple-500/20 text-purple-400",
  };
  return (
    <div className={`glass-panel rounded-2xl border p-6 bg-gradient-to-br ${colors[color]} hover-glow`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium tracking-wide opacity-80 mb-2 uppercase">{title}</div>
          <div className="text-4xl font-bold text-white tracking-tight">{value ?? "—"}</div>
          {subtitle && <div className="text-xs mt-2 opacity-60 font-medium">{subtitle}</div>}
        </div>
        {Icon && <div className="p-2 bg-white/5 rounded-lg"><Icon size={28} className="opacity-80" /></div>}
      </div>
    </div>
  );
}
