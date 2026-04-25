import Link from "next/link";
import {
  mockHasTechnicalAccess,
  mockRemainingCredits,
  mockUserPlan,
} from "../mock-data";
import { TechnicalPaywallCard } from "./technical-paywall-card";

export function TechnicalChatWorkspace() {
  const hasAccess = mockHasTechnicalAccess || mockRemainingCredits > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#123C7C]">
              Chat tecnico pago
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">
              Consulta com fontes normativas
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Plano mock: {mockUserPlan}
          </span>
        </div>
        <textarea
          className="mt-5 min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10"
          placeholder="Ex.: Qual cabo para subestacao de 300 kVA considerando a concessionaria e tensao de atendimento?"
        />
        <button className="mt-4 rounded-xl bg-[#123C7C] px-5 py-3 text-sm font-semibold text-white">
          Classificar e consultar
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[#E0F2FE] p-4">
            <p className="text-sm text-slate-600">Classificacao</p>
            <p className="mt-1 font-semibold text-[#075985]">Tecnica paga</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Contexto faltante</p>
            <p className="mt-1 font-semibold text-[#0F172A]">
              Tensao, estado, concessionaria
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Acesso</p>
            <p className="mt-1 font-semibold text-[#0F172A]">
              {hasAccess ? "Liberado" : "Bloqueado por paywall"}
            </p>
          </div>
        </div>
      </div>

      {hasAccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-[#0F172A]">
          <h3 className="text-xl font-semibold">Resposta tecnica completa</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Conteudo futuro liberado com busca em documentos, tabelas, abacos e
            fontes. Se a base nao tiver fonte suficiente, a resposta deve
            informar a insuficiencia.
          </p>
          <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-700">
            Fontes futuras: documento, versao, pagina, item, tabela e trecho.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-[#123C7C] px-4 py-3 text-sm font-semibold text-white" href="/pdf-preview/technical">
              Gerar PDF tecnico
            </Link>
            <Link className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#123C7C]" href="/pdf-preview/client">
              Gerar PDF para cliente
            </Link>
          </div>
        </div>
      ) : (
        <TechnicalPaywallCard />
      )}
    </div>
  );
}
