export function PlanBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-xs font-semibold text-[#F8E7A1]">
      {label}
    </span>
  );
}
