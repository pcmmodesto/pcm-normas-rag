export function TechnicalPaywallCard() {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#FFF8E1] p-5 text-[#0F172A] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6A00]">
        Consulta tecnica avancada
      </p>
      <h3 className="mt-2 text-xl font-semibold">
        Esta resposta exige acesso tecnico.
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        A pergunta depende de normas, tabelas, criterios de engenharia ou
        fontes rastreaveis. Para liberar a resposta completa, use credito avulso
        ou assinatura.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <button className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white">
          Comprar consulta - R$ 10,00
        </button>
        <button className="rounded-xl border border-[#123C7C]/25 bg-white px-4 py-3 text-sm font-semibold text-[#123C7C]">
          Assinar mensal - R$ 30
        </button>
        <button className="rounded-xl border border-[#123C7C]/25 bg-white px-4 py-3 text-sm font-semibold text-[#123C7C]">
          Plano anual - R$ 306
        </button>
      </div>
    </div>
  );
}
