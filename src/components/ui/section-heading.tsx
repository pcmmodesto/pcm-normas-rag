type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#b88405]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-[#172033] md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-[#5a667a] md:text-lg">
        {description}
      </p>
    </div>
  );
}
