type UsageBarProps = {
  label: string;
  value: number;
  tone?: "dark" | "light";
};

export function UsageBar({ label, value, tone = "light" }: UsageBarProps) {
  const width = Math.max(0, Math.min(100, value));
  const isDark = tone === "dark";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={isDark ? "text-[#CBD5E1]" : "text-slate-600"}>{label}</span>
        <span className={`font-semibold ${isDark ? "text-white" : "text-[#0F172A]"}`}>
          {width}%
        </span>
      </div>
      <div className={`h-2 rounded-full ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#19A7E8] to-[#276EF1]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
