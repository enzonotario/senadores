import type { ChamberId } from "./chamber";
import { getDiputadosRaw } from "./diputados-data";
import { getSenadoresRaw } from "./senadores-data";
import {
  buildMemberCareer,
  shouldShowCareer,
  type CareerCargo,
  type CareerPersonRef,
} from "../utils/memberCareer";

/**
 * Historial de cargos para la ficha. Cruza dumps de ambas cámaras en server;
 * el browser solo recibe el array ya resuelto vía mini-API.
 */
export async function getMemberCareerCargos(
  current: CareerPersonRef & { chamber: ChamberId },
): Promise<CareerCargo[]> {
  if (current.chamber !== "diputados" && current.chamber !== "senadores") {
    return [];
  }

  const [diputados, senadores] = await Promise.all([
    getDiputadosRaw(),
    getSenadoresRaw(),
  ]);

  const cargos = buildMemberCareer({
    current: {
      chamber: current.chamber,
      id: current.id,
      nombreCompleto: current.nombreCompleto,
      apellido: current.apellido,
      nombre: current.nombre,
      provincia: current.provincia,
      genero: current.genero,
    },
    diputados,
    senadores,
  });

  if (!shouldShowCareer(cargos, current)) return [];
  return cargos;
}
