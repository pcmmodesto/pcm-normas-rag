const statusClassNames: Record<string, string> = {
  active: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  trial: "border-sky-300/30 bg-sky-400/10 text-sky-200",
  past_due: "border-amber-300/30 bg-amber-400/10 text-amber-200",
  canceled: "border-slate-300/30 bg-slate-400/10 text-slate-200",
  expired: "border-slate-300/30 bg-slate-400/10 text-slate-200",
  enviado: "border-sky-300/30 bg-sky-400/10 text-sky-200",
  pendente: "border-amber-300/30 bg-amber-400/10 text-amber-200",
  processando: "border-blue-300/30 bg-blue-400/10 text-blue-200",
  indexado: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  erro: "border-red-300/30 bg-red-400/10 text-red-200",
  success: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  error: "border-red-300/30 bg-red-400/10 text-red-200",
  gerado: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  falhou: "border-red-300/30 bg-red-400/10 text-red-200",
  respondida: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
  "precisa contexto": "border-amber-300/30 bg-amber-400/10 text-amber-200",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statusClassNames[key] ?? "border-white/15 bg-white/10 text-[#CBD5E1]"
      }`}
    >
      {status}
    </span>
  );
}
