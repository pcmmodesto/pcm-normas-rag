import {
  EQUIPMENT_LOAD_CATALOG,
  normalizeTechnicalText,
  type EquipmentLoadProfile,
} from "./equipment-load-catalog";

export type ExtractedLoadEquipment = {
  equipmentKey: string;
  rawName: string;
  displayName: string;
  quantity: number;
  unitPowerW: number;
  totalPowerW: number;
  capacityBtu?: number;
  motorCv?: number;
  assumption: boolean;
  notes?: string;
};

export type InformedLoad = {
  value: number;
  unit: "kW" | "kVA";
};

export type LoadEntities = {
  equipments: ExtractedLoadEquipment[];
  city?: string;
  state?: string;
  voltage?: string;
  connectionType?: "MONOFASICO" | "BIFASICO" | "TRIFASICO";
  informedLoad?: InformedLoad;
  missingContext: string[];
  hasEquipmentList: boolean;
  hasDimensioningRequest: boolean;
  hasServiceRequest: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
};

const CITY_STATE_PATTERNS: Array<{ pattern: RegExp; city: string; state: string }> = [
  { pattern: /\baltamira\s*(?:\/|\s+|-)?\s*(?:pa|para)\b/, city: "Altamira", state: "PA" },
  { pattern: /\baltamira\b/, city: "Altamira", state: "PA" },
  { pattern: /\bbelem\s*(?:\/|\s+|-)?\s*(?:pa|para)\b/, city: "Belem", state: "PA" },
  { pattern: /\bsantarem\s*(?:\/|\s+|-)?\s*(?:pa|para)\b/, city: "Santarem", state: "PA" },
  { pattern: /\bmaraba\s*(?:\/|\s+|-)?\s*(?:pa|para)\b/, city: "Maraba", state: "PA" },
  { pattern: /\bsao\s+luis\s*(?:\/|\s+|-)?\s*(?:ma|maranhao)?\b/, city: "Sao Luis", state: "MA" },
  { pattern: /\bsao\s+luiz\s*(?:\/|\s+|-)?\s*(?:ma|maranhao)?\b/, city: "Sao Luis", state: "MA" },
];

export function extractLoadEntities(question: string): LoadEntities {
  const normalized = normalizeTechnicalText(question);
  const equipments = extractEquipments(question);
  const location = extractLocation(normalized);
  const voltage = extractVoltage(normalized);
  const connectionType = extractConnectionType(normalized);
  const informedLoad = extractInformedLoad(normalized);
  const hasDimensioningRequest =
    /cabo|disjuntor|padrao de entrada|ramal de entrada|ramal de conexao|entrada de servico|dimension/.test(
      normalized,
    );
  const hasServiceRequest =
    /como pedir|como solicitar|solicitar.*ligacao|pedir.*ligacao|ligacao nova|documentos necessarios|quais documentos/.test(
      normalized,
    );

  return {
    equipments,
    city: location.city,
    state: location.state,
    voltage,
    connectionType,
    informedLoad,
    missingContext: buildMissingContext({
      equipments,
      informedLoad,
      voltage,
      connectionType,
      state: location.state,
      hasDimensioningRequest,
    }),
    hasEquipmentList: equipments.length > 0,
    hasDimensioningRequest,
    hasServiceRequest,
  };
}

function extractEquipments(question: string): ExtractedLoadEquipment[] {
  const normalized = normalizeTechnicalText(question);
  const found = new Map<string, ExtractedLoadEquipment>();

  for (const profile of EQUIPMENT_LOAD_CATALOG) {
    const matches = findProfileMentions(normalized, profile);
    if (matches.length === 0) continue;

    const capacityBtu = matches.map((match) => extractNearbyBtu(normalized, match.index)).find(Boolean);
    const motorCv = matches.map((match) => extractNearbyCv(normalized, match.index)).find(Boolean);
    const key = capacityBtu === 12000 && profile.key.startsWith("ar_condicionado")
      ? "ar_condicionado_12000_btu"
      : profile.key;
    const effectiveProfile =
      key === profile.key
        ? profile
        : EQUIPMENT_LOAD_CATALOG.find((item) => item.key === key) ?? profile;
    const quantity = matches.reduce((sum, match) => sum + (extractQuantityBefore(normalized, match.index) ?? 1), 0);
    const unitPowerW = motorCv && /bomba|motor/.test(key)
      ? Math.round(motorCv * 736)
      : effectiveProfile.defaultPowerW;

    found.set(key, {
      equipmentKey: key,
      rawName: Array.from(new Set(matches.map((match) => match.rawName))).join(", "),
      displayName: effectiveProfile.displayName,
      quantity,
      unitPowerW,
      totalPowerW: quantity * unitPowerW,
      capacityBtu,
      motorCv,
      assumption: true,
      notes: motorCv && /bomba|motor/.test(key)
        ? `Potencia de motor estimada por conversao de CV. Para dimensionamento definitivo, validar corrente nominal, rendimento e fator de potencia na placa do equipamento.`
        : effectiveProfile.notes,
    });
  }

  return Array.from(found.values());
}

function findProfileMentions(normalizedQuestion: string, profile: EquipmentLoadProfile) {
  const matches: Array<{ index: number; rawName: string }> = [];
  const aliases = [...profile.aliases].sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const normalizedAlias = normalizeTechnicalText(alias);
    const re = new RegExp(`\\b${escapeRegExp(normalizedAlias)}\\b`, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalizedQuestion)) !== null) {
      if (matches.some((item) => rangesOverlap(item.index, item.index + item.rawName.length, match!.index, match!.index + normalizedAlias.length))) {
        continue;
      }
      matches.push({ index: match.index, rawName: alias });
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function extractQuantityBefore(normalizedQuestion: string, index: number) {
  const before = normalizedQuestion.slice(Math.max(0, index - 28), index).trim();
  const numeric = /(\d+)\s*(?:x|un|unidades?|aparelhos?|equipamentos?)?\s*$/.exec(before);
  if (numeric) return Number(numeric[1]);

  const word = /([a-z]+)\s*$/.exec(before)?.[1];
  return word ? NUMBER_WORDS[word] : null;
}

function extractNearbyBtu(normalizedQuestion: string, index: number) {
  const around = normalizedQuestion.slice(Math.max(0, index - 40), index + 80);
  const match = /(\d{1,3}(?:[.\s]?\d{3})?)\s*btu/.exec(around);
  if (!match) return undefined;
  return Number(match[1].replace(/[.\s]/g, ""));
}

function extractNearbyCv(normalizedQuestion: string, index: number) {
  const around = normalizedQuestion.slice(Math.max(0, index - 20), index + 80);
  const match = /(\d+(?:[,.]\d+)?)\s*(?:cv|hp)\b/.exec(around);
  if (!match) return undefined;
  return Number(match[1].replace(",", "."));
}

function extractLocation(normalizedQuestion: string) {
  for (const item of CITY_STATE_PATTERNS) {
    if (item.pattern.test(normalizedQuestion)) {
      return { city: item.city, state: item.state };
    }
  }

  if (/\bpa\b|para/.test(normalizedQuestion)) return { state: "PA" };
  if (/\bma\b|maranhao/.test(normalizedQuestion)) return { state: "MA" };
  return {};
}

function extractVoltage(normalizedQuestion: string) {
  if (/\b127\s*\/\s*220\s*v?\b/.test(normalizedQuestion)) return "127/220";
  if (/\b220\s*\/\s*(?:380|308)\s*v?\b/.test(normalizedQuestion)) return "220/380";

  const simple = /\b(127|220|380)\s*v\b/.exec(normalizedQuestion);
  if (simple) return `${simple[1]}V`;

  return undefined;
}

function extractConnectionType(normalizedQuestion: string): LoadEntities["connectionType"] {
  if (/trif|tri[-\s]?fas/.test(normalizedQuestion)) return "TRIFASICO";
  if (/bif|bi[-\s]?fas/.test(normalizedQuestion)) return "BIFASICO";
  if (/monof|mono[-\s]?fas/.test(normalizedQuestion)) return "MONOFASICO";
  return undefined;
}

function extractInformedLoad(normalizedQuestion: string): InformedLoad | undefined {
  const match = /(\d+(?:[,.]\d+)?)\s*(kva|kw)\b/.exec(normalizedQuestion);
  if (!match) return undefined;
  return {
    value: Number(match[1].replace(",", ".")),
    unit: match[2].toLowerCase() === "kva" ? "kVA" : "kW",
  };
}

function buildMissingContext(params: {
  equipments: ExtractedLoadEquipment[];
  informedLoad?: InformedLoad;
  voltage?: string;
  connectionType?: LoadEntities["connectionType"];
  state?: string;
  hasDimensioningRequest: boolean;
}) {
  if (!params.hasDimensioningRequest) return [];

  const missing: string[] = [];
  if (!params.informedLoad && params.equipments.length === 0) {
    missing.push("carga instalada ou lista de equipamentos");
  }
  if (!params.voltage) missing.push("tensao de atendimento (ex.: 127/220 V ou 220/380 V)");
  if (!params.connectionType) missing.push("tipo de ligacao (monofasico, bifasico ou trifasico)");
  if (!params.state) missing.push("cidade/estado ou concessionaria/tabela aplicavel");
  return missing;
}
