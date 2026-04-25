type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  tone?: "dark" | "light";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "light",
}: PageHeaderProps) {
  const isDark = tone === "dark";
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19A7E8]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`mt-3 text-3xl font-semibold tracking-tight md:text-5xl ${
            isDark ? "text-white" : "text-[#0F172A]"
          }`}
        >
          {title}
        </h1>
        <p
          className={`mt-4 text-base leading-7 ${
            isDark ? "text-[#CBD5E1]" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
