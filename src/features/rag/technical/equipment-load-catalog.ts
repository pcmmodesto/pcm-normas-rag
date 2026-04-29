export type EquipmentLoadProfile = {
  key: string;
  aliases: string[];
  displayName: string;
  defaultPowerW: number;
  minPowerW?: number;
  maxPowerW?: number;
  notes?: string;
};

export const EQUIPMENT_LOAD_CATALOG: EquipmentLoadProfile[] = [
  {
    key: "geladeira",
    aliases: ["geladeira", "geladeiras", "refrigerador", "refrigeradores"],
    displayName: "Geladeira / refrigerador",
    defaultPowerW: 300,
  },
  {
    key: "televisao",
    aliases: ["televisao", "televisoes", "tv", "tvs", "televisor", "televisores"],
    displayName: "Televisao / TV",
    defaultPowerW: 150,
  },
  {
    key: "microondas",
    aliases: ["microondas", "micro ondas", "micro-ondas", "forno microondas", "forno micro ondas", "forno micro-ondas"],
    displayName: "Micro-ondas",
    defaultPowerW: 1500,
  },
  {
    key: "bomba_motor_cv",
    aliases: ["bomba", "bombas", "motor", "motores", "motobomba", "motobombas"],
    displayName: "Bomba / motor",
    defaultPowerW: 736,
    notes: "Potencia estimada por CV informado: 1 cv = 736 W. Validar potencia eletrica nominal de placa.",
  },
  {
    key: "ar_condicionado_12000_btu",
    aliases: [
      "ar condicionado",
      "ar-condicionado",
      "ar condicionados",
      "ar-condicionados",
      "ar condicionado 12000 btu",
      "ar-condicionado 12000 btu",
      "ar condicionados 12000 btu",
      "ar-condicionados 12000 btu",
      "split",
      "splits",
      "split 12000 btu",
      "splits 12000 btu",
    ],
    displayName: "Ar-condicionado split 12.000 BTU/h",
    defaultPowerW: 1200,
    notes:
      "BTU/h representa capacidade termica, nao potencia eletrica. Para dimensionamento definitivo, usar potencia nominal de placa ou catalogo.",
  },
  {
    key: "maquina_lavar",
    aliases: ["maquina de lavar", "maquinas de lavar", "lavadora", "lavadoras"],
    displayName: "Maquina de lavar",
    defaultPowerW: 800,
  },
  {
    key: "chuveiro",
    aliases: ["chuveiro", "chuveiros", "ducha eletrica", "duchas eletricas"],
    displayName: "Chuveiro eletrico",
    defaultPowerW: 5500,
  },
  {
    key: "computador",
    aliases: ["computador", "computadores", "pc", "pcs", "notebook", "notebooks"],
    displayName: "Computador",
    defaultPowerW: 300,
  },
  {
    key: "iluminacao",
    aliases: ["iluminacao", "ponto de luz", "pontos de luz", "lampada", "lampadas"],
    displayName: "Iluminacao / ponto de luz",
    defaultPowerW: 100,
  },
  {
    key: "tomada_uso_geral",
    aliases: ["tomada", "tomadas", "ponto de tomada", "pontos de tomada"],
    displayName: "Tomada de uso geral",
    defaultPowerW: 100,
  },
];

export function normalizeTechnicalText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function findEquipmentProfileByAlias(text: string) {
  const normalized = normalizeTechnicalText(text);
  return EQUIPMENT_LOAD_CATALOG.find((profile) =>
    profile.aliases.some((alias) => normalized.includes(normalizeTechnicalText(alias))),
  );
}
