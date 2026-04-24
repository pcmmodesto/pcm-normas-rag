import type { RagPdfSection } from "../lib/types";

type PdfSectionProps = {
  section: RagPdfSection;
};

export function PdfSection({ section }: PdfSectionProps) {
  return (
    <section className="rounded border border-[#d8dde6] bg-white p-6">
      <h2 className="text-xl font-semibold text-[#172033]">{section.title}</h2>
      {section.body ? (
        <p className="mt-4 text-sm leading-7 text-[#384457]">{section.body}</p>
      ) : null}
      {section.items ? (
        <ol className="mt-4 space-y-3">
          {section.items.map((item, index) => (
            <li className="flex gap-3 text-sm leading-6 text-[#384457]" key={item}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#f5c542] text-xs font-bold text-[#172033]">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {section.rows ? (
        <div className="mt-4 overflow-hidden rounded border border-[#e5e9f0]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#f2f5f9] text-[#384457]">
              <tr>
                <th className="px-4 py-3 font-semibold">Criterio</th>
                <th className="px-4 py-3 font-semibold">Verificacao</th>
                <th className="px-4 py-3 font-semibold">Nota</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr className="border-t border-[#e5e9f0]" key={row.label}>
                  <td className="px-4 py-3 font-medium text-[#172033]">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-[#384457]">{row.value}</td>
                  <td className="px-4 py-3 text-[#657187]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

