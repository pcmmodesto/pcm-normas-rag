"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AdminNormativeFigure,
  AdminNormativeTable,
} from "@/features/admin/lib/normative-structures";

type Props = {
  initialFigures: AdminNormativeFigure[];
  initialTables: AdminNormativeTable[];
};

type RowEditValues = {
  copperMultiplexedMm2: string;
  aluminumQuadruplexMm2: string;
  galvanizedSteelConduitInch: string;
  customerPhaseNeutralConductorMm2: string;
  groundingConductorMm2: string;
};

type TableLayout =
  | "DIMENSIONING"
  | "APPLIANCE_POWER"
  | "DEMAND_FACTOR"
  | "MINIMUM_LOAD_DEMAND"
  | "VOLTAGE_BY_CITY"
  | "MATERIAL_DIMENSIONS"
  | "GENERIC";

export function NormativeTablesClient({ initialFigures, initialTables }: Props) {
  const [figures] = useState(initialFigures);
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

  async function validateTable(tableId: string, validationStatus: "VALIDATED" | "PENDING") {
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
                validatedAt: validationStatus === "VALIDATED" ? new Date() : null,
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
                  table.validationStatus === "VALIDATED"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {table.validationStatus === "VALIDATED" ? "validada" : "nao validada"}
                </span>
                <button
                  className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-800 disabled:opacity-50"
                  disabled={busy === table.id}
                  onClick={() => validateTable(table.id, "VALIDATED")}
                  type="button"
                >
                  Validar
                </button>
                <button
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
                  disabled={busy === table.id}
                  onClick={() => validateTable(table.id, "PENDING")}
                  type="button"
                >
                  Marcar pendente
                </button>
              </div>
            </div>

            <TableRowsPreview
              busy={busy}
              table={table}
              updateRow={updateRow}
            />
          </section>
        ))
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#123C7C]">
            Desenhos, legendas e notas estruturadas
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#0F172A]">
            Figuras normativas extraidas
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Conferencia dos desenhos, itens de legenda, responsabilidades e notas detectadas no processamento.
          </p>
        </div>
        {figures.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum desenho estruturado encontrado.</p>
        ) : (
          <div className="grid gap-3">
            {figures.map((figure) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={figure.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#0F172A]">{figure.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    Pag. {figure.pageNumber}
                  </span>
                  {figure.relatedTableNumber && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      Tabela {figure.relatedTableNumber}
                    </span>
                  )}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    {figure.itemCount} itens
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    {figure.noteCount} notas
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {figure.documentTitle} | {figure.versionLabel}
                </p>
                {figure.concessionaireItems.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Itens da concessionaria
                    </p>
                    <ul className="mt-1 grid gap-1 text-xs text-slate-700 md:grid-cols-2">
                      {figure.concessionaireItems.slice(0, 8).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {figure.notes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Notas
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700">
                      {figure.notes.slice(0, 4).map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TableRowsPreview({
  table,
  busy,
  updateRow,
}: {
  table: AdminNormativeTable;
  busy: string | null;
  updateRow: (rowId: string, payload: RowEditValues) => Promise<void>;
}) {
  const layout = detectTableLayout(table);
  if (layout === "DIMENSIONING") {
    return (
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
    );
  }

  const headers = layout === "GENERIC" ? inferGenericHeaders(table) : headersForLayout(layout);
  const minWidth = Math.max(720, headers.length * 190);

  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Formato detectado: <strong>{labelForLayout(layout)}</strong>. Estas linhas sao fonte de consulta/instrucao, nao tabela de cabo/disjuntor.
      </div>
      <table className="w-full text-left text-xs" style={{ minWidth }}>
        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Linha</th>
            {headers.map((header) => (
              <th className="px-3 py-2" key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.rows.map((row) => {
            const cells = cellsFromRow(row);
            return (
              <tr key={row.id}>
                <td className="px-3 py-2 font-medium text-slate-500">{row.rowIndex}</td>
                {headers.map((_, index) => (
                  <td className="px-3 py-2 align-top text-slate-700" key={index}>
                    {cells[index] ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
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

function detectTableLayout(table: AdminNormativeTable): TableLayout {
  const category = normalize(table.category);
  const title = normalize(table.title);
  const hasSizingData = table.rows.some(
    (row) =>
      row.breakerAmp != null ||
      row.copperMultiplexedMm2 != null ||
      row.aluminumQuadruplexMm2 != null ||
      row.loadMaxKw != null,
  );

  if (category.includes("SERVICE_ENTRANCE_SIZING") || category.includes("CABLE_SIZING") || category.includes("BREAKER_SIZING")) {
    return "DIMENSIONING";
  }
  if (hasSizingData && (title.includes("DIMENSIONAMENTO") || title.includes("RAMAL DE CONEXAO") || title.includes("DISJUNTOR"))) {
    return "DIMENSIONING";
  }
  if (category.includes("APPLIANCE_POWER") || title.includes("POTENCIA DE APARELHOS") || title.includes("ELETRODOMESTICOS")) {
    return "APPLIANCE_POWER";
  }
  if (category.includes("DEMAND_FACTOR") || title.includes("FATORES DE DEMANDA") || title.includes("FATOR DE DEMANDA")) {
    return "DEMAND_FACTOR";
  }
  if (category.includes("MINIMUM_LOAD_DEMAND") || title.includes("CARGA MINIMA") || title.includes("ILUMINACAO E TOMADAS")) {
    return "MINIMUM_LOAD_DEMAND";
  }
  if (category.includes("VOLTAGE_BY_CITY") || title.includes("NIVEL DE TENSAO POR MUNICIPIO") || title.includes("MUNICIPIO")) {
    return "VOLTAGE_BY_CITY";
  }
  if (category.includes("MATERIAL_DIMENSIONS") || title.includes("DIMENSOES") || title.includes("CONDUTORES/HASTE")) {
    return "MATERIAL_DIMENSIONS";
  }
  return "GENERIC";
}

function headersForLayout(layout: TableLayout) {
  switch (layout) {
    case "APPLIANCE_POWER":
      return ["Aparelho / descricao", "Especificacao", "Potencia (W)", "Aparelho / descricao", "Especificacao", "Potencia (W)"];
    case "DEMAND_FACTOR":
      return ["Numero de aparelhos", "Fator ate 3,5 kW", "Fator maior que 3,5 kW"];
    case "MINIMUM_LOAD_DEMAND":
      return ["Descricao", "Carga minima", "Fator de demanda"];
    case "VOLTAGE_BY_CITY":
      return ["Municipio", "Nivel de tensao", "Regional", "Municipio", "Nivel de tensao", "Regional"];
    case "MATERIAL_DIMENSIONS":
      return ["Item", "Codigo/descricao", "Dimensoes", "Material", "Resistencia/observacao"];
    default:
      return ["Coluna 1"];
  }
}

function labelForLayout(layout: TableLayout) {
  const labels: Record<TableLayout, string> = {
    DIMENSIONING: "dimensionamento tecnico",
    APPLIANCE_POWER: "potencia de aparelhos",
    DEMAND_FACTOR: "fator de demanda",
    MINIMUM_LOAD_DEMAND: "carga minima/demanda",
    VOLTAGE_BY_CITY: "tensao por municipio",
    MATERIAL_DIMENSIONS: "dimensoes de materiais",
    GENERIC: "tabela generica",
  };
  return labels[layout];
}

function cellsFromRow(row: AdminNormativeTable["rows"][number]) {
  const raw = row.rawRowJson;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "cells" in raw) {
    const cells = (raw as { cells?: unknown }).cells;
    if (Array.isArray(cells)) {
      return cells.map((cell) => String(cell ?? ""));
    }
  }
  if (row.rawText) {
    return row.rawText.split(/\s+\|\s+|\t|;/).map((cell) => cell.trim()).filter(Boolean);
  }
  return [
    row.supplyType,
    formatRange(row.loadMinKw, row.loadMaxKw),
    row.breakerAmp != null ? `${row.breakerAmp} A` : null,
    row.notes,
  ].filter((cell): cell is string => Boolean(cell));
}

function inferGenericHeaders(table: AdminNormativeTable) {
  const maxColumns = Math.max(1, ...table.rows.map((row) => cellsFromRow(row).length));
  return Array.from({ length: maxColumns }, (_, index) => `Coluna ${index + 1}`);
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}
