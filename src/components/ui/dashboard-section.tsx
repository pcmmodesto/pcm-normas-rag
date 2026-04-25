type DashboardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: "dark" | "light";
};

export function DashboardSection({
  title,
  description,
  children,
  action,
  tone = "light",
}: DashboardSectionProps) {
  const isDark = tone === "dark";
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        isDark
          ? "border-slate-400/15 bg-[#0A1633]/92 shadow-cyan-950/20"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-[#0F172A]"}`}>
            {title}
          </h2>
          {description ? (
            <p className={`mt-2 text-sm leading-6 ${isDark ? "text-[#CBD5E1]" : "text-slate-600"}`}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
