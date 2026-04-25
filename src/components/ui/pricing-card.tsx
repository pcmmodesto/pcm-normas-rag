import { PlanBadge } from "./plan-badge";

type PricingCardProps = {
  name: string;
  price: string;
  cadence: string;
  badge: string;
  features: string[];
  tone?: "dark" | "light";
};

export function PricingCard({
  name,
  price,
  cadence,
  badge,
  features,
  tone = "dark",
}: PricingCardProps) {
  const isDark = tone === "dark";
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border p-6 shadow-sm ${
        isDark
          ? "border-slate-400/15 bg-white/[0.06]"
          : "border-slate-200 bg-white"
      }`}
    >
      <PlanBadge label={badge} />
      <h2 className={`mt-5 text-xl font-semibold ${isDark ? "text-white" : "text-[#0F172A]"}`}>
        {name}
      </h2>
      <p className={`mt-4 text-3xl font-semibold ${isDark ? "text-white" : "text-[#0F172A]"}`}>
        {price}
      </p>
      <p className={`mt-1 text-sm ${isDark ? "text-[#94A3B8]" : "text-slate-500"}`}>
        {cadence}
      </p>
      <ul className={`mt-6 flex-1 space-y-3 text-sm leading-6 ${isDark ? "text-[#CBD5E1]" : "text-slate-600"}`}>
        {features.map((feature) => (
          <li className="border-l border-[#19A7E8]/50 pl-3" key={feature}>
            {feature}
          </li>
        ))}
      </ul>
      <button
        className={
          isDark
            ? "mt-6 rounded-xl border border-[#19A7E8]/50 bg-[#19A7E8]/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#19A7E8]/20"
            : "mt-6 rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0A1633]"
        }
      >
        Pagamento em breve
      </button>
    </article>
  );
}
