import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())


export enum FormaVoto {
  AFIRMATIVO = "si",
  NEGATIVO = "no",
  AUSENTE = "ausente",
  ABSTENCION = "abstencion",
}

export interface Voto {
  nombre: string;
  voto: FormaVoto;
  banca: string;
}

export interface Votacion {
  actaId: number;
  titulo: string;
  proyecto: string;
  descripcion: string;
  quorumTipo: string;
  fecha: string;
  acta: string;
  mayoria: string;
  miembros: number;
  afirmativos: number;
  negativos: number;
  abstenciones: number;
  presentes: number;
  ausentes: number;
  amn: number;
  resultado: string;
  votos: Voto[];
  observaciones: string[];
}

export interface Senator {
  foto: string;
  nombre: string;
  provincia: string;
  partido: string;
  email: string;
  telefono: string;
  redes: string[];
}

export function useVotaciones() {
  const { data, error } = useSWR<Votacion[]>(
    "https://api.argentinadatos.com/v1/senado/actas/",
    fetcher,
  )
  return {
    votaciones: data,
    isLoading: !error && !data,
    isError: error,
  }
}

export function useSenatorsData() {
  const { data, error } = useSWR<Senator[]>(
    "https://api.argentinadatos.com/v1/senado/senadores/",
    fetcher,
  )
  return {
    senatorsData: data,
    isLoading: !error && !data,
    isError: error,
  }
}

