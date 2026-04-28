import type { LoadEntities, ExtractedLoadEquipment } from "./load-entity-extractor";

export type CalculatedLoadItem = ExtractedLoadEquipment;

export type InstalledLoadCalculation = {
  items: CalculatedLoadItem[];
  totalPowerW: number | null;
  totalPowerKw: number | null;
  estimatedKva: number | null;
  effectiveLoadKw: number | null;
  effectiveLoadKva: number | null;
  warnings: string[];
  assumptions: string[];
  confidence: number;
  source: "INFORMED_LOAD" | "EQUIPMENT_SUM" | "EMPTY";
};

const DEFAULT_POWER_FACTOR = 0.92;

export function calculateInstalledLoad(entities: LoadEntities): InstalledLoadCalculation {
  const warnings: string[] = [];
  const assumptions: string[] = [];

  if (entities.informedLoad) {
    const value = entities.informedLoad.value;
    const unit = entities.informedLoad.unit;
    const effectiveLoadKw = unit === "kW" ? value : null;
    const effectiveLoadKva = unit === "kVA" ? value : null;
    if (unit === "kVA") {
      warnings.push("Carga informada em kVA. Para tabelas em kW, confirme o criterio normativo ou fator de potencia aplicavel.");
    }

    return {
      items: entities.equipments,
      totalPowerW: unit === "kW" ? value * 1000 : null,
      totalPowerKw: effectiveLoadKw,
      estimatedKva: effectiveLoadKva,
      effectiveLoadKw: effectiveLoadKw ?? value,
      effectiveLoadKva: effectiveLoadKva ?? null,
      warnings,
      assumptions,
      confidence: 0.85,
      source: "INFORMED_LOAD",
    };
  }

  if (entities.equipments.length === 0) {
    return {
      items: [],
      totalPowerW: null,
      totalPowerKw: null,
      estimatedKva: null,
      effectiveLoadKw: null,
      effectiveLoadKva: null,
      warnings: [],
      assumptions: [],
      confidence: 0,
      source: "EMPTY",
    };
  }

  const totalPowerW = entities.equipments.reduce((sum, item) => sum + item.totalPowerW, 0);
  const totalPowerKw = totalPowerW / 1000;
  const estimatedKva = totalPowerKw / DEFAULT_POWER_FACTOR;

  assumptions.push("Potencias unitarias adotadas do catalogo tecnico inicial do sistema.");
  assumptions.push(`kVA estimado usando fator de potencia padrao ${DEFAULT_POWER_FACTOR.toLocaleString("pt-BR")}.`);

  for (const item of entities.equipments) {
    if (item.notes) warnings.push(`${item.displayName}: ${item.notes}`);
  }
  warnings.push("Carga estimada. Para dimensionamento definitivo, validar potencias de placa/catalogo e criterio de demanda aplicavel.");

  return {
    items: entities.equipments,
    totalPowerW,
    totalPowerKw,
    estimatedKva,
    effectiveLoadKw: totalPowerKw,
    effectiveLoadKva: estimatedKva,
    warnings,
    assumptions,
    confidence: 0.65,
    source: "EQUIPMENT_SUM",
  };
}
