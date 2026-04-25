import Link from "next/link";
import { freeChatExamples } from "../mock-data";

export function FreeChatWidget() {
  return (
    <div className="rounded-2xl border border-slate-400/15 bg-white p-6 text-[#0F172A] shadow-2xl shadow-cyan-950/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#123C7C]">
            Consulta gratuita
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Tire duvidas basicas de baixa tensao
          </h2>
        </div>
        <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#075985]">
          Preview
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {freeChatExamples.map((example) => (
          <button
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-[#19A7E8] hover:bg-white"
            key={example}
            type="button"
          >
            {example}
          </button>
        ))}
      </div>
      <textarea
        className="mt-5 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
        placeholder="Digite uma pergunta basica sobre ligacao nova, documentos ou atendimento..."
      />
      <div className="mt-4 rounded-xl border border-[#19A7E8]/20 bg-[#E0F2FE] p-4 text-sm leading-6 text-[#0F172A]">
        Resposta demonstrativa: para ligacao nova em baixa tensao, normalmente
        voce precisa dos documentos pessoais, endereco da unidade, carga
        prevista e padrao de entrada adequado. Consulte sempre a norma e o
        atendimento da concessionaria.
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white">
          Perguntar gratis
        </button>
        <Link
          className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-[#123C7C]"
          href="/login"
        >
          Acessar chat tecnico
        </Link>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Consultas tecnicas avancadas exigem compra avulsa ou assinatura.
      </p>
    </div>
  );
}
