type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  tone?: "dark" | "light";
};

export function MetricCard({
  label,
  value,
  detail,
  trend,
  tone = "light",
}: MetricCardProps) {
  const isDark = tone === "dark";
  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        isDark
          ? "border-slate-400/15 bg-white/[0.06] shadow-cyan-950/20"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className={`text-sm font-medium ${isDark ? "text-[#CBD5E1]" : "text-slate-600"}`}>
          {label}
        </p>
        {trend ? (
          <span className="rounded-full border border-[#19A7E8]/40 bg-[#19A7E8]/10 px-2.5 py-1 text-xs font-semibold text-[#8EDBFF]">
            {trend}
          </span>
        ) : null}
      </div>
      <p className={`mt-4 text-3xl font-semibold ${isDark ? "text-white" : "text-[#0F172A]"}`}>
        {value}
      </p>
      <p className={`mt-2 text-sm leading-6 ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
        {detail}
      </p>
    </article>
  );
}
