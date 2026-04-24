import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export default function UploadPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-12">
        <SectionHeading
          eyebrow="Cadastro de normas"
          title="Upload de normas técnicas"
          description="Área visual para preparar o envio de PDFs. O upload real, storage e processamento dos arquivos serão adicionados em uma etapa futura."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <form className="rounded border border-[#d8dde6] bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-[#384457]">
              Título da norma
              <input
                className="mt-2 w-full rounded border border-[#c8d0dc] px-3 py-3 outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
                placeholder="Ex.: Norma de conexão em baixa tensão"
                type="text"
              />
            </label>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-[#384457]">
                Concessionária
                <input
                  className="mt-2 w-full rounded border border-[#c8d0dc] px-3 py-3 outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
                  placeholder="Nome da concessionária"
                  type="text"
                />
              </label>
              <label className="block text-sm font-medium text-[#384457]">
                Versão
                <input
                  className="mt-2 w-full rounded border border-[#c8d0dc] px-3 py-3 outline-none transition focus:border-[#123c69] focus:ring-2 focus:ring-[#123c69]/15"
                  placeholder="2026.1"
                  type="text"
                />
              </label>
            </div>
            <div className="mt-6 rounded border border-dashed border-[#aeb8c7] bg-[#f8fafc] p-8 text-center">
              <p className="font-semibold text-[#172033]">
                Solte um PDF aqui ou selecione um arquivo
              </p>
              <p className="mt-2 text-sm text-[#657187]">
                Componente demonstrativo. Nenhum arquivo será enviado agora.
              </p>
              <button
                className="mt-5 rounded border border-[#c8d0dc] px-4 py-2 font-semibold text-[#172033] transition hover:bg-white"
                type="button"
              >
                Selecionar PDF
              </button>
            </div>
            <button
              className="mt-6 rounded bg-[#123c69] px-5 py-3 font-semibold text-white opacity-70"
              type="button"
            >
              Salvar rascunho
            </button>
          </form>

          <aside className="rounded border border-[#d8dde6] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#172033]">
              Metadados previstos
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-[#384457]">Páginas</dt>
                <dd className="mt-1 text-[#657187]">
                  Total de páginas e mapeamento por trecho.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#384457]">Chunks</dt>
                <dd className="mt-1 text-[#657187]">
                  Segmentos preparados para embeddings e busca semântica.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#384457]">Fontes</dt>
                <dd className="mt-1 text-[#657187]">
                  Citação da norma, página e trecho usado em cada resposta.
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
