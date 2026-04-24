type PdfDisclaimerProps = {
  disclaimer: string;
};

export function PdfDisclaimer({ disclaimer }: PdfDisclaimerProps) {
  return (
    <section className="rounded border border-[#f0d27c] bg-[#fff8df] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a6500]">
        Aviso obrigatorio
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#4b3a08]">{disclaimer}</p>
    </section>
  );
}

