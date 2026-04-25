import { AppShell } from "@/components/layout/app-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { DocumentUploadForm } from "@/features/documents/components/document-upload-form";

export default function UploadPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-5 py-12">
        <SectionHeading
          eyebrow="Cadastro de normas"
          title="Upload de normas tecnicas"
          description="Envie PDFs para o bucket privado do Supabase Storage e registre os metadados iniciais para processamento futuro."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <DocumentUploadForm />

          <aside className="rounded border border-[#d8dde6] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#172033]">
              Metadados previstos
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-[#384457]">Paginas</dt>
                <dd className="mt-1 text-[#657187]">
                  Total de paginas e mapeamento por trecho.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#384457]">Chunks</dt>
                <dd className="mt-1 text-[#657187]">
                  Segmentos preparados para embeddings e busca semantica.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#384457]">Fontes</dt>
                <dd className="mt-1 text-[#657187]">
                  Citacao da norma, pagina e trecho usado em cada resposta.
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
