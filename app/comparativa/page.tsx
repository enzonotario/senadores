import type { Metadata } from "next"
import ComparativaContent from "./ComparativaContent"

export const metadata: Metadata = {
  title: "Comparativa de Senadores | Votaciones del Senado Argentino",
  description: "Compara los votos y coincidencias entre dos senadores argentinos",
}

export default function Comparativa() {
  return <ComparativaContent />
}

