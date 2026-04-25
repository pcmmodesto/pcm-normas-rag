import { StatusBadge } from "./status-badge";

type AdminTableProps = {
  headers: string[];
  rows: string[][];
  statusColumn?: number;
  tone?: "dark" | "light";
};

export function AdminTable({
  headers,
  rows,
  statusColumn,
  tone = "dark",
}: AdminTableProps) {
  const isDark = tone === "dark";
  return (
    <div
      className={`overflow-x-auto rounded-2xl border ${
        isDark ? "border-white/10" : "border-slate-200"
      }`}
    >
      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
        <thead
          className={`text-xs uppercase tracking-[0.12em] ${
            isDark ? "bg-white/[0.04] text-[#94A3B8]" : "bg-slate-50 text-slate-500"
          }`}
        >
          <tr>
            {headers.map((header) => (
              <th className="px-4 py-3 font-semibold" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={`divide-y ${
            isDark
              ? "divide-white/10 bg-[#050B1F]/35"
              : "divide-slate-100 bg-white"
          }`}
        >
          {rows.map((row) => (
            <tr className={isDark ? "text-[#CBD5E1]" : "text-slate-700"} key={row.join("|")}>
              {row.map((cell, index) => (
                <td className="whitespace-nowrap px-4 py-4" key={`${cell}-${index}`}>
                  {statusColumn === index ? <StatusBadge status={cell} /> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
