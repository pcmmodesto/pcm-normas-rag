type PdfChecklistProps = {
  title: string;
  items: string[];
};

export function PdfChecklist({ title, items }: PdfChecklistProps) {
  return (
    <section className="rounded border border-[#d8dde6] bg-white p-6">
      <h2 className="text-xl font-semibold text-[#172033]">{title}</h2>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li className="flex gap-3 text-sm leading-6 text-[#384457]" key={item}>
            <span className="mt-1 h-4 w-4 shrink-0 rounded border border-[#8d9aae] bg-[#f8fafc]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

