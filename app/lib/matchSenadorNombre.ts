/**
 * Matching voto↔senador: tildes, nombres parciales y aliases locales editables.
 *
 * Editá los overrides permanentes en `manual` de:
 *   app/data/senadores-alias-nombres.json
 *
 * `auto` son sugerencias ya detectadas (tildes / 2º nombre / apellidos cortos).
 * Si un caso nuevo falla, agregalo en `manual` con el id del senador.
 */

import aliasesFile from "../data/senadores-alias-nombres.json";

export interface AliasNombresFile {
  _comment?: string;
  manual?: Record<string, string>;
  auto?: Record<string, string>;
}

export function foldNombre(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/[^a-z0-9,\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function claveApellidoNombre(nombre: string): string | null {
  const folded = foldNombre(nombre);
  if (!folded) return null;

  let apellidos: string[];
  let nombres: string[];
  if (folded.includes(",")) {
    const [apellidoRaw, ...rest] = folded.split(",");
    apellidos = apellidoRaw.trim().split(/\s+/).filter(Boolean);
    nombres = rest.join(",").trim().split(/\s+/).filter(Boolean);
  } else {
    const tokens = folded.split(/\s+/).filter(Boolean);
    apellidos = tokens.slice(0, 1);
    nombres = tokens.slice(1);
  }

  if (!apellidos[0] || !nombres[0]) return null;
  return `${apellidos[0]}|${nombres[0]}`;
}

export function flattenAliasMap(
  aliases: AliasNombresFile | null | undefined = aliasesFile as AliasNombresFile,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!aliases) return map;

  for (const [nombre, id] of Object.entries(aliases.auto || {})) {
    if (nombre && id) {
      map.set(nombre, String(id));
      map.set(foldNombre(nombre), String(id));
    }
  }
  // manual pisa auto
  for (const [nombre, id] of Object.entries(aliases.manual || {})) {
    if (nombre && id) {
      map.set(nombre, String(id));
      map.set(foldNombre(nombre), String(id));
    }
  }
  return map;
}

let _aliasMap: Map<string, string> | null = null;

export function getSenadoresAliasMap(): Map<string, string> {
  if (!_aliasMap) {
    _aliasMap = flattenAliasMap(aliasesFile as AliasNombresFile);
  }
  return _aliasMap;
}

/** Para tests / hot-reload de aliases en memoria. */
export function clearSenadoresAliasMapCache() {
  _aliasMap = null;
}

export function votoCoincideConSenador(options: {
  votoNombre: string;
  votoSlug: string;
  senadorId: string;
  senadorNombre: string;
  senadorSlug: string;
  aliasMap?: Map<string, string>;
}): boolean {
  const {
    votoNombre,
    votoSlug,
    senadorId,
    senadorNombre,
    senadorSlug,
    aliasMap = getSenadoresAliasMap(),
  } = options;

  if (votoSlug && senadorSlug && votoSlug === senadorSlug) {
    return true;
  }

  if (foldNombre(votoNombre) === foldNombre(senadorNombre)) {
    return true;
  }

  const aliasId =
    aliasMap.get(votoNombre) || aliasMap.get(foldNombre(votoNombre));
  if (aliasId && aliasId === String(senadorId)) {
    return true;
  }

  const claveVoto = claveApellidoNombre(votoNombre);
  const claveSenador = claveApellidoNombre(senadorNombre);
  if (claveVoto && claveSenador && claveVoto === claveSenador) {
    return true;
  }

  return false;
}
