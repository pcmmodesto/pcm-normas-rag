export type ElectricalUnit = {
  value: number;
  unit: string;
  raw: string;
};

export function normalizeTechnicalText(text: string): string {
  return text
    .replace(/mm\s*2\b/gi, "mm²")
    .replace(/\bkva\b/gi, "kVA")
    .replace(/\bkw\b/gi, "kW")
    .replace(/\bkv\b/gi, "kV")
    .replace(/NORMA T[ÉE]CNICA[\s\S]*?DOCUMENTO N[ÃA]O CONTROLADO\s*/g, "")
    .trim();
}

export function extractElectricalUnits(text: string): ElectricalUnit[] {
  const results: ElectricalUnit[] = [];

  const patterns: Array<[RegExp, string]> = [
    [/(\d+(?:[.,]\d+)?)\s*mm[²2]/gi, "mm²"],
    [/(\d+(?:[.,]\d+)?)\s*kva/gi, "kVA"],
    [/(\d+(?:[.,]\d+)?)\s*kw\b/gi, "kW"],
    [/(\d+(?:[.,]\d+)?)\s*kv\b/gi, "kV"],
    [/(\d+(?:[.,]\d+)?)\s*awg\b/gi, "AWG"],
  ];

  for (const [pattern, unit] of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(",", "."));
      if (!isNaN(value)) {
        results.push({ value, unit, raw: match[0].trim() });
      }
    }
  }

  return results;
}

export function buildSearchText(params: {
  documentTitle: string;
  concessionaria: string | null;
  stateCodes: string[] | null;
  versionLabel: string;
  chunkText: string;
  sectionTitle?: string | null;
  tableTitle?: string | null;
  chunkType?: string;
}): string {
  const {
    documentTitle,
    concessionaria,
    stateCodes,
    versionLabel,
    chunkText,
    sectionTitle,
    tableTitle,
    chunkType,
  } = params;

  const parts: string[] = [documentTitle, versionLabel];

  if (concessionaria) parts.push(concessionaria);
  if (stateCodes && stateCodes.length > 0) parts.push(stateCodes.join(" "));
  if (sectionTitle) parts.push(sectionTitle);
  if (tableTitle) parts.push(tableTitle);

  if (chunkType === "TABLE" || chunkType === "TABLE_ROW") {
    const units = extractElectricalUnits(chunkText);
    for (const u of units.slice(0, 5)) {
      parts.push(u.raw);
    }
  }

  parts.push(normalizeTechnicalText(chunkText));

  return parts.join(" ").toLowerCase();
}
