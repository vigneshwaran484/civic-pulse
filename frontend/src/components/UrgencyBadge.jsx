export default function UrgencyBadge({ score }) {
  const n = Number(score);
  const cfg =
    n >= 8
      ? { cls: "bg-red-100 text-red-700 border-red-300", label: "Critical" }
      : n >= 6
      ? { cls: "bg-orange-100 text-orange-700 border-orange-300", label: "High" }
      : n >= 4
      ? { cls: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "Medium" }
      : { cls: "bg-green-100 text-green-700 border-green-300", label: "Low" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {n}/10 {cfg.label}
    </span>
  );
}
