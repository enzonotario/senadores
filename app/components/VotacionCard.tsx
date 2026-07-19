"use client"

import Link from "next/link"
import ProgressBar from "./ProgressBar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type VotacionCardProps = {
  id: string
  proyecto: string
  titulo: string
  fecha: string
  afirmativos: number
  negativos: number
  abstenciones: number
  resultado: string
}

export default function VotacionCard({
  id,
  proyecto,
  titulo,
  fecha,
  afirmativos,
  negativos,
  abstenciones,
  resultado
}: VotacionCardProps) {
  // Asegurarse de que los valores sean números
  const affirmativeNum = Number(afirmativos) || 0
  const negativeNum = Number(negativos) || 0
  const abstentionsNum = Number(abstenciones) || 0
  
  const total = affirmativeNum + negativeNum + abstentionsNum
  
  // Calcular porcentajes solo si hay votos
  const affirmativePercentage = total > 0 ? ((affirmativeNum / total) * 100).toFixed(1) : "0.0"
  const negativePercentage = total > 0 ? ((negativeNum / total) * 100).toFixed(1) : "0.0"
  const abstentionsPercentage = total > 0 ? ((abstentionsNum / total) * 100).toFixed(1) : "0.0"

  const getCardStyles = () => {
    switch (resultado?.toUpperCase()) {
      case "AFIRMATIVA":
        return "bg-green-900/20 border-2 border-green-900/40"
      case "NEGATIVA":
        return "bg-red-900/20 border-2 border-red-900/40"
      default:
        return "bg-gray-800 border-2 border-gray-700"
    }
  }

  return (
    <Link
      href={`/votaciones/${id}`}
      className={`block p-6 ${getCardStyles()} rounded-lg shadow-md hover:bg-opacity-90 transition-colors`}
    >
      <div className="flex flex-col gap-2 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h2 className="text-xl font-bold line-clamp-2">{titulo || "Sin título"}</h2>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-sm">{titulo || "Sin título"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-sm text-gray-400">{proyecto}</p>
      </div>
      <p className="text-gray-400 mb-4">Fecha: {fecha}</p>
      <ProgressBar 
        affirmative={affirmativeNum} 
        negative={negativeNum} 
        abstentions={abstentionsNum} 
      />
      <div className="flex justify-between text-sm mt-4">
        <span className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
          <span className="text-green-400">
            Afirmativo: {affirmativePercentage}% ({affirmativeNum})
          </span>
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
          <span className="text-red-400">
            Negativo: {negativePercentage}% ({negativeNum})
          </span>
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
          <span className="text-yellow-400">
            Abstenciones: {abstentionsPercentage}% ({abstentionsNum})
          </span>
        </span>
      </div>
    </Link>
  )
}

