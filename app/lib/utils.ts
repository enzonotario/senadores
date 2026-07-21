import type {
  Acta,
  Senador,
  FilterConfig,
  SortConfig,
  Voto,
} from "./types";
import type {
  Acta as DiputadoActa,
  Diputado,
} from "./types-diputados";

export function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export function isSenadorActivo(senador: Senador): boolean {
  const now = new Date();
  const finReal = senador.periodoReal?.fin
    ? new Date(senador.periodoReal.fin)
    : null;
  if (finReal && finReal <= now) return false;

  const finLegal = senador.periodoLegal?.fin
    ? new Date(senador.periodoLegal.fin)
    : null;
  if (finLegal && finLegal <= now) return false;

  const inicio =
    senador.periodoReal?.inicio || senador.periodoLegal?.inicio || null;
  if (inicio && new Date(inicio) > now) return false;

  // Sin fechas claras: considerar inactivo
  if (!inicio && !finLegal && !finReal) return false;
  return true;
}

export function sortSenadores(
  senadores: Senador[],
  sortConfig: SortConfig,
): Senador[] {
  return [...senadores].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortConfig.key.includes(".")) {
      const [parent, child] = sortConfig.key.split(".");
      aValue = (a as any)[parent]?.[child];
      bValue = (b as any)[parent]?.[child];
    } else {
      aValue = (a as any)[sortConfig.key];
      bValue = (b as any)[sortConfig.key];
    }

    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

function isEmptyFilterValue(value: unknown): boolean {
  if (value == null || value === "" || value === "all") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function matchesStringFilter(
  fieldValue: string,
  filterValue: string | string[],
  mode: "exact" | "includes" = "exact",
): boolean {
  const field = fieldValue.toLowerCase();
  const candidates = Array.isArray(filterValue) ? filterValue : [filterValue];

  return candidates.some((candidate) => {
    const needle = String(candidate).toLowerCase();
    return mode === "includes" ? field.includes(needle) : field === needle;
  });
}

const TEXT_SEARCH_KEYS = new Set([
  "nombreCompleto",
  "nombre",
  "apellido",
  "titulo",
]);

export function filterSenadores(
  senadores: Senador[],
  filters: FilterConfig,
): Senador[] {
  return senadores.filter((senador) => {
    return Object.entries(filters).every(([key, value]) => {
      if (isEmptyFilterValue(value)) return true;

      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        const parentValue = (senador as any)[parent];
        if (typeof parentValue === "object" && parentValue !== null) {
          const childValue = parentValue[child];
          if (typeof childValue === "string") {
            return matchesStringFilter(
              childValue,
              value as string | string[],
              TEXT_SEARCH_KEYS.has(key) ? "includes" : "exact",
            );
          }
          return Array.isArray(value)
            ? value.includes(childValue)
            : childValue === value;
        }
        return false;
      }

      const fieldValue = (senador as any)[key];
      if (typeof fieldValue === "string") {
        return matchesStringFilter(
          fieldValue,
          value as string | string[],
          TEXT_SEARCH_KEYS.has(key) ? "includes" : "exact",
        );
      }
      return Array.isArray(value)
        ? value.includes(fieldValue)
        : fieldValue === value;
    });
  });
}

export function sortActas(actas: Acta[], sortConfig: SortConfig): Acta[] {
  return [...actas].sort((a, b) => {
    const aValue = (a as any)[sortConfig.key];
    const bValue = (b as any)[sortConfig.key];

    const aCompare = typeof aValue === "string" ? aValue.toLowerCase() : aValue;
    const bCompare = typeof bValue === "string" ? bValue.toLowerCase() : bValue;

    if (aCompare < bCompare) return sortConfig.direction === "asc" ? -1 : 1;
    if (aCompare > bCompare) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

export function filterActas(actas: Acta[] | any[], filters: FilterConfig): Acta[] {
  return (actas as Acta[]).filter((acta) => {
    return Object.entries(filters).every(([key, value]) => {
      if (isEmptyFilterValue(value)) return true;

      const actaValue = (acta as any)[key];

      if (key === "fechaStart")
        return new Date(acta.fecha) >= new Date(value as string);
      if (key === "fechaEnd")
        return new Date(acta.fecha) <= new Date(value as string);

      if (typeof actaValue === "string") {
        return matchesStringFilter(
          actaValue,
          value as string | string[],
          TEXT_SEARCH_KEYS.has(key) ? "includes" : "exact",
        );
      }

      if (typeof actaValue === "number") {
        const numValue = Number(Array.isArray(value) ? value[0] : value);
        if (key.includes("Min")) {
          const actualKey = key.replace("Min", "");
          return (acta as any)[actualKey] >= numValue;
        }
        if (key.includes("Max")) {
          const actualKey = key.replace("Max", "");
          return (acta as any)[actualKey] <= numValue;
        }
        return actaValue === numValue;
      }

      return Array.isArray(value)
        ? value.includes(actaValue)
        : actaValue === value;
    });
  });
}

export function getUniqueValues(items: any[], key: string): string[] {
  const values = new Set<string>();
  items.forEach((item) => {
    if (key.includes(".")) {
      const [parent, child] = key.split(".");
      const parentValue = item[parent];
      if (typeof parentValue === "object" && parentValue !== null) {
        const childValue = parentValue[child];
        if (childValue) values.add(String(childValue));
      }
    } else {
      const value = item[key];
      if (value) values.add(String(value));
    }
  });
  return Array.from(values).sort();
}

export function getYearsFromActas(actas: Acta[] | any[]): string[] {
  const years = new Set<string>();
  actas.forEach((acta) => {
    if (acta.fecha) years.add(new Date(acta.fecha).getFullYear().toString());
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export function calcularEstadisticasSenador(actas: Acta[]) {
  let totalVotaciones = 0;
  let votosAfirmativos = 0;
  let votosNegativos = 0;
  let abstenciones = 0;
  let ausencias = 0;

  actas.forEach((acta) => {
    if (!acta.votoSenador) return;
    totalVotaciones++;

    switch (acta.votoSenador.tipoVoto.toLowerCase()) {
      case "afirmativo":
        votosAfirmativos++;
        break;
      case "negativo":
        votosNegativos++;
        break;
      case "abstencion":
        abstenciones++;
        break;
      case "ausente":
        ausencias++;
        break;
      default:
        break;
    }
  });

  const presentismo =
    totalVotaciones > 0
      ? ((totalVotaciones - ausencias) / totalVotaciones) * 100
      : 0;

  return {
    totalVotaciones,
    votosAfirmativos,
    votosNegativos,
    abstenciones,
    ausencias,
    presentismo: Math.round(presentismo * 10) / 10,
  };
}

export function sortVotos(votos: Voto[], sortConfig: SortConfig): Voto[] {
  return [...votos].sort((a, b) => {
    const aValue = (a as any)[sortConfig.key];
    const bValue = (b as any)[sortConfig.key];

    const aCompare = typeof aValue === "string" ? aValue.toLowerCase() : aValue;
    const bCompare = typeof bValue === "string" ? bValue.toLowerCase() : bValue;

    if (aCompare < bCompare) return sortConfig.direction === "asc" ? -1 : 1;
    if (aCompare > bCompare) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

/** Parsea "Apellido, Nombre". */
export function parseNombreSenador(raw: string) {
  const full = String(raw || "").trim();
  if (!full) {
    return { apellido: "", nombreDePila: "", nombreCompleto: "" };
  }
  if (full.includes(",")) {
    const [apellido, ...rest] = full.split(",");
    return {
      apellido: apellido.trim(),
      nombreDePila: rest.join(",").trim(),
      nombreCompleto: full,
    };
  }
  return { apellido: "", nombreDePila: full, nombreCompleto: full };
}

export function isDiputadoActivo(diputado: Diputado): boolean {
  const now = new Date();
  const finMandato = new Date(diputado.periodoMandato.fin);
  const ceseFecha = new Date(diputado.ceseFecha || "9999-12-31");
  return finMandato > now && ceseFecha > now;
}

export function sortDiputados(
  diputados: Diputado[],
  sortConfig: SortConfig,
): Diputado[] {
  return [...diputados].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortConfig.key.includes(".")) {
      const [parent, child] = sortConfig.key.split(".");
      aValue = (a as any)[parent]?.[child];
      bValue = (b as any)[parent]?.[child];
    } else {
      aValue = (a as any)[sortConfig.key];
      bValue = (b as any)[sortConfig.key];
    }

    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
}

export function filterDiputados(
  diputados: Diputado[],
  filters: FilterConfig,
): Diputado[] {
  return diputados.filter((diputado) => {
    return Object.entries(filters).every(([key, value]) => {
      if (isEmptyFilterValue(value)) return true;

      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        const parentValue = (diputado as any)[parent];
        if (typeof parentValue === "object" && parentValue !== null) {
          const childValue = parentValue[child];
          if (typeof childValue === "string") {
            return matchesStringFilter(
              childValue,
              value as string | string[],
              TEXT_SEARCH_KEYS.has(key) ? "includes" : "exact",
            );
          }
          return Array.isArray(value)
            ? value.includes(childValue)
            : childValue === value;
        }
        return false;
      }

      const diputadoValue = (diputado as any)[key];
      if (typeof diputadoValue === "string") {
        return matchesStringFilter(
          diputadoValue,
          value as string | string[],
          TEXT_SEARCH_KEYS.has(key) ? "includes" : "exact",
        );
      }
      return Array.isArray(value)
        ? value.includes(diputadoValue)
        : diputadoValue === value;
    });
  });
}

export function calcularEstadisticasDiputado(actas: DiputadoActa[]) {
  let totalVotaciones = 0;
  let votosAfirmativos = 0;
  let votosNegativos = 0;
  let abstenciones = 0;
  let ausencias = 0;

  actas.forEach((acta) => {
    if (!acta.votoDiputado) return;
    totalVotaciones++;

    switch (acta.votoDiputado.tipoVoto.toLowerCase()) {
      case "afirmativo":
        votosAfirmativos++;
        break;
      case "negativo":
        votosNegativos++;
        break;
      case "abstencion":
        abstenciones++;
        break;
      case "ausente":
        ausencias++;
        break;
      default:
        break;
    }
  });

  const presentismo =
    totalVotaciones > 0
      ? ((totalVotaciones - ausencias) / totalVotaciones) * 100
      : 0;

  return {
    totalVotaciones,
    votosAfirmativos,
    votosNegativos,
    abstenciones,
    ausencias,
    presentismo: Math.round(presentismo * 10) / 10,
  };
}
