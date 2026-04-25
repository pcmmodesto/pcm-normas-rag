"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  BRAZILIAN_STATES,
  DOCUMENT_TYPE_OPTIONS,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from "../lib/upload-constants";

type UploadResult = {
  ok: boolean;
  success?: boolean;
  stage?: string;
  message?: string;
  document?: {
    id: string;
    title: string;
    versionId: string;
  };
  error?: string;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#19A7E8] focus:ring-4 focus:ring-[#19A7E8]/10";

export function DocumentUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) {
      return "Nenhum PDF selecionado.";
    }

    const sizeMb = selectedFile.size / 1024 / 1024;
    return `${selectedFile.name} (${sizeMb.toFixed(1)} MB)`;
  }, [selectedFile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const clientError = validateClientForm(formData, selectedFile);

    if (clientError) {
      setError(clientError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as UploadResult;

      if (!response.ok || !result.ok || !result.document) {
        setError(
          result.message ??
            result.error ??
            "Nao foi possivel enviar o documento.",
        );
        return;
      }

      setMessage(
        `Documento cadastrado: ${result.document.title} (${result.document.id}).`,
      );
      form.reset();
      setSelectedFile(null);
    } catch {
      setError("Falha de comunicacao ao enviar o PDF. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-6 text-[#0F172A] shadow-sm"
      onSubmit={handleSubmit}
    >
      <label className="block text-sm font-medium text-slate-700">
        Titulo da norma
        <input
          className={inputClassName}
          maxLength={180}
          name="title"
          placeholder="Ex.: Norma de conexao em baixa tensao"
          required
          type="text"
        />
      </label>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Concessionaria
          <input
            className={inputClassName}
            maxLength={120}
            name="concessionaire"
            placeholder="Nome da concessionaria"
            required
            type="text"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Estado
          <select className={inputClassName} defaultValue="" name="state" required>
            <option disabled value="">
              Selecione
            </option>
            {BRAZILIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Tipo de documento
          <select
            className={inputClassName}
            defaultValue=""
            name="documentType"
            required
          >
            <option disabled value="">
              Selecione
            </option>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Versao
          <input
            className={inputClassName}
            maxLength={60}
            name="versionLabel"
            placeholder="2026.1"
            required
            type="text"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Data de publicacao
          <input className={inputClassName} name="publishedAt" type="date" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Tags
          <input
            className={inputClassName}
            name="tags"
            placeholder="baixa tensao, padrao de entrada"
            type="text"
          />
        </label>
      </div>

      <label className="mt-5 block text-sm font-medium text-slate-700">
        Descricao
        <textarea
          className={`${inputClassName} min-h-28 resize-y`}
          maxLength={800}
          name="description"
          placeholder="Resumo opcional sobre a norma."
        />
      </label>

      <div className="mt-6 rounded-2xl border border-dashed border-[#19A7E8]/45 bg-[#F8FAFC] p-8 text-center">
        <p className="font-semibold text-[#0F172A]">
          Solte um PDF aqui ou selecione um arquivo
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Arquivo PDF privado, ate 50 MB. O texto sera processado em etapa
          futura.
        </p>
        <input
          accept="application/pdf,.pdf"
          className="sr-only"
          name="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          ref={fileInputRef}
          required
          type="file"
        />
        <button
          className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-[#123C7C] transition hover:border-[#19A7E8]"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          Selecionar PDF
        </button>
        <p className="mt-3 text-sm text-slate-600">{selectedFileLabel}</p>
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{message}</p>
          <Link className="mt-2 inline-flex font-semibold text-[#123C7C]" href="/admin/documents">
            Ver em documentos
          </Link>
        </div>
      ) : null}

      <button
        className="mt-6 rounded-xl bg-[#123C7C] px-5 py-3 font-semibold text-white transition hover:bg-[#0A1633] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Enviando..." : "Cadastrar e enviar PDF"}
      </button>
    </form>
  );
}

function validateClientForm(formData: FormData, file: File | null) {
  if (!String(formData.get("title") ?? "").trim()) {
    return "Informe o titulo da norma.";
  }

  if (!String(formData.get("concessionaire") ?? "").trim()) {
    return "Informe a concessionaria.";
  }

  if (!String(formData.get("documentType") ?? "").trim()) {
    return "Informe o tipo de documento.";
  }

  if (!String(formData.get("state") ?? "").trim()) {
    return "Informe o estado.";
  }

  if (!String(formData.get("versionLabel") ?? "").trim()) {
    return "Informe a versao.";
  }

  if (!file) {
    return "Selecione um arquivo PDF.";
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "Envie somente arquivos PDF.";
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return "O PDF deve ter no maximo 50 MB.";
  }

  return null;
}
