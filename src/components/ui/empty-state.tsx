type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "dark" | "light";
};

export function EmptyState({
  title,
  description,
  action,
  tone = "light",
}: EmptyStateProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={`rounded-2xl border border-dashed p-8 text-center ${
        isDark
          ? "border-white/20 bg-white/[0.04]"
          : "border-slate-300 bg-slate-50"
      }`}
    >
      <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-[#0F172A]"}`}>
        {title}
      </p>
      <p
        className={`mx-auto mt-2 max-w-xl text-sm leading-6 ${
          isDark ? "text-[#CBD5E1]" : "text-slate-600"
        }`}
      >
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
