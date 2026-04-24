type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded border border-[#d8dde6] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#657187]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#123c69]">{value}</p>
      <p className="mt-2 text-sm text-[#657187]">{detail}</p>
    </div>
  );
}
