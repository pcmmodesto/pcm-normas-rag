"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AdminNormativeTable } from "@/features/admin/lib/normative-structures";

type Props = {
  initialTables: AdminNormativeTable[];
};

type RowEditValues = {
  copperMultiplexedMm2: string;
  aluminumQuadruplexMm2: string;
  galvanizedSteelConduitInch: string;
  customerPhaseNeutralConductorMm2: string;
  groundingConductorMm2: string;
};

export function NormativeTablesClient({ initialTables }: Props) {
  const [tables, setTables] = useState(initialTables);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function importTable2() {
    setBusy("import");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/normative-tables/import-table-2", {
        method: "POST",
      });
      const data = await response.json();
      setMessage(data.message ?? (data.ok ? "Importacao concluida." : "Falha na importacao."));
      if (data.ok) location.reload();
    } finally {
      setBusy(null);
    }
  }

  async function validateTable(tableId: string, validationStatus: "VALIDADA" | "NAO_VALIDADA") {
    setBusy(tableId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/normative-tables/${tableId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ validationStatus }),
      });
      const data = await response.json();
      if (!data.ok) {
        setMessage(data.message ?? "Nao foi possivel atualizar a tabela.");
        return;
      }
      setTables((current) =>
        current.map((table) =>
          table.id === tableId
            ? {
                ...table,
                validationStatus,
                validatedAt: validationStatus === "VALIDADA" ? new Date() : null,
              }
            : table,
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function updateRow(rowId: string, payload: RowEditValues) {
    setBusy(rowId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/normative-table-rows/${rowId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setMessage(data.message ?? (data.ok ? "Linha atualizada." : "Nao foi possivel atualizar a linha."));
      if (data.ok) location.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Importacao inicial semi-manual</p>
          <p className="text-sm text-slate-600">
            Carrega a Tabela 2 da NT.00001.EQTL-09 como dados confiaveis para consulta tecnica.
          </p>
        </div>
        <button
          className="rounded-xl bg-[#123C7C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy === "import"}
          onClick={importTable2}
          type="button"
        >
          {busy === "import" ? "Importando..." : "Importar Tabela 2"}
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {message}
        </div>
      )}

      {tables.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Nenhuma tabela normativa estruturada encontrada.
        </div>
      ) : (
        tables.map((table) => (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={table.id}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
                  {table.documentTitle} | {table.versionLabel} | Pag. {table.pageNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#0F172A]">
                  Tabela {table.tableNumber ?? "-"} - {table.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {table.concessionaire ?? "Concessionaria nao informada"} | {table.state ?? "-"} | {table.voltage ?? "-"} | {table.rowCount} linhas
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  table.validationStatus === "VALIDADA"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {table.validationStatus === "VALIDADA" ? "validada" : "nao validada"}
                </span>
                <button
                  className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-800 disabled:opacity-50"
                  disabled={busy === table.id}
                  onClick={() => validateTable(table.id, "VALIDADA")}
                  type="button"
                >
                  Validar
                </button>
                <button
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
                  disabled={busy === table.id}
                  onClick={() => validateTable(table.id, "NAO_VALIDADA")}
                  type="button"
                >
                  Marcar pendente
                </button>
              </div>
            </div>

            <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1200px] text-left text-xs">
                <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Linha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Carga kW</th>
                    <th className="px-3 py-2">Disjuntor</th>
                    <th className="px-3 py-2">Cobre multip.</th>
                    <th className="px-3 py-2">Al. quadruplex</th>
                    <th className="px-3 py-2">Eletroduto</th>
                    <th className="px-3 py-2">F/N cliente</th>
                    <th className="px-3 py-2">Aterramento</th>
                    <th className="px-3 py-2">Salvar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-medium">{row.rowIndex}</td>
                      <td className="px-3 py-2">{row.supplyType}</td>
                      <td className="px-3 py-2">{formatRange(row.loadMinKw, row.loadMaxKw)}</td>
                      <td className="px-3 py-2">{row.breakerAmp} A ({row.breakerType})</td>
      <EditableRowCells busy={busy === row.id} row={row} updateRow={updateRow} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function EditableRowCells({
  row,
  busy,
  updateRow,
}: {
  row: AdminNormativeTable["rows"][number];
  busy: boolean;
  updateRow: (rowId: string, payload: RowEditValues) => Promise<void>;
}) {
  const [values, setValues] = useState({
    copperMultiplexedMm2: String(row.copperMultiplexedMm2 ?? ""),
    aluminumQuadruplexMm2: String(row.aluminumQuadruplexMm2 ?? ""),
    galvanizedSteelConduitInch: String(row.galvanizedSteelConduitInch ?? ""),
    customerPhaseNeutralConductorMm2: String(row.customerPhaseNeutralConductorMm2 ?? ""),
    groundingConductorMm2: String(row.groundingConductorMm2 ?? ""),
  });

  return (
    <>
      <td className="px-3 py-2">
        <SmallInput name="copperMultiplexedMm2" setValues={setValues} value={values.copperMultiplexedMm2} />
      </td>
      <td className="px-3 py-2">
        <SmallInput name="aluminumQuadruplexMm2" setValues={setValues} value={values.aluminumQuadruplexMm2} />
      </td>
      <td className="px-3 py-2">
        <SmallInput name="galvanizedSteelConduitInch" setValues={setValues} value={values.galvanizedSteelConduitInch} />
      </td>
      <td className="px-3 py-2">
        <SmallInput name="customerPhaseNeutralConductorMm2" setValues={setValues} value={values.customerPhaseNeutralConductorMm2} />
      </td>
      <td className="px-3 py-2">
        <SmallInput name="groundingConductorMm2" setValues={setValues} value={values.groundingConductorMm2} />
      </td>
      <td className="px-3 py-2">
        <button
          className="rounded-lg bg-[#123C7C] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => void updateRow(row.id, values)}
          type="button"
        >
          {busy ? "..." : "Salvar"}
        </button>
      </td>
    </>
  );
}

function SmallInput({
  name,
  value,
  setValues,
}: {
  name: string;
  value: string;
  setValues: Dispatch<SetStateAction<RowEditValues>>;
}) {
  return (
    <input
      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#19A7E8]"
      name={name}
      onChange={(event) =>
        setValues((current) => ({ ...current, [name]: event.target.value }))
      }
      value={value}
    />
  );
}

function formatRange(min: number | null, max: number | null) {
  if (min === null || min === undefined) return `Ate ${max ?? "-"}`;
  return `${min} ate ${max ?? "-"}`;
}
