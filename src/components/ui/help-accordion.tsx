type HelpAccordionProps = {
  sections: string[][];
};

export function HelpAccordion({ sections }: HelpAccordionProps) {
  return (
    <div className="space-y-3">
      {sections.map(([title, content]) => (
        <details
          className="rounded-lg border border-white/10 bg-white/[0.05] p-5"
          key={title}
        >
          <summary className="cursor-pointer text-base font-semibold text-white">
            {title}
          </summary>
          <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">{content}</p>
        </details>
      ))}
    </div>
  );
}
