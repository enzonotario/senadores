"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Avatar from "../../components/Avatar"
import { useVotaciones, useSenatorsData } from "../../lib/data"
import { Armchair, CheckCircle2, XCircle, CircleDot, Search, Download } from "lucide-react"
import Skeleton from "../../components/Skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { getPartyLogoPath } from "../../lib/utils/partyLogos"

interface Senator {
  nombre: string;
  foto: string;
  partido: string;
  provincia: string;
  email: string;
  telefono: string;
  redes: string[];
}

export default function VotacionDetalleContent({ id }: { id: string }) {
  const { votaciones, isLoading: isLoadingVotaciones, isError: isErrorVotaciones } = useVotaciones()
  const { senatorsData, isLoading: isLoadingSenatorsData, isError: isErrorSenatorsData } = useSenatorsData()
  const [votacion, setVotacion] = useState<any>(null)

  useEffect(() => {
    if (votaciones) {
      const votacionData = votaciones.find((v: any) => v.actaId.toString() === id)
      console.log('Total votes in votacion:', votacionData?.votos?.length)
      setVotacion(votacionData)
    }
  }, [votaciones, id])

  const getBadgeVariant = (result: string) => {
    switch (result.toUpperCase()) {
      case "AFIRMATIVA":
        return "default"
      case "NEGATIVA":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('es-AR', options);
  }

  if (isErrorVotaciones || isErrorSenatorsData) return <div>Error al cargar los datos</div>
  if (isLoadingVotaciones || isLoadingSenatorsData) return <Skeleton className="h-96" />
  if (!votacion) return <div>Votación no encontrada</div>

  const handleDownload = () => {
    window.open(`https://www.senado.gob.ar/votaciones/verActaVotacion/${id}`, "_blank")
  }
  return (
    <main className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl font-bold leading-tight">{votacion.titulo || "Sin título"}</h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-start md:items-center text-muted-foreground">
                  <span className="block">{formatDate(votacion.fecha)}</span>
                </div>
                <div className="flex items-start md:items-center text-muted-foreground">
                  <span className="block font-medium mr-2">Quórum:</span>
                  <span className="block">{votacion.quorumTipo}</span>
                </div>
                <div className="flex items-start md:items-center text-muted-foreground">
                  <span className="block font-medium mr-2">Mayoría:</span>
                  <span className="block">{votacion.mayoria}</span>
                </div>
              </div>
              {votacion.descripcion && (
                <p className="text-muted-foreground text-sm leading-relaxed">{votacion.descripcion}</p>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <Badge 
                variant={getBadgeVariant(votacion.resultado)} 
                className="text-base px-6 py-1.5 h-9 capitalize rounded-full font-medium shadow-lg justify-center"
              >
                {votacion.resultado}
              </Badge>
              <Button variant="link" className="rounded-full" onClick={handleDownload} >
                <Download size={16} />
                Descargar Acta de Votación
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
          {/* Card de Asistencia */}
          <div className="bg-card backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-4 md:py-6 border-b border-border">
              <h3 className="text-xl font-semibold">Asistencia</h3>
            </div>
            <div className="p-4 md:p-8">
              <div className="grid grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-8">
                <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center">
                  <span className="block text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{votacion.presentes}</span>
                  <span className="text-sm text-muted-foreground font-medium">Presentes</span>
                </div>
                <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-6 text-center">
                  <span className="block text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{votacion.ausentes}</span>
                  <span className="text-sm text-muted-foreground font-medium">Ausentes</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {Array.from({ length: votacion.miembros }).map((_, index) => (
                  <Armchair
                    key={index}
                    size={16}
                    className={index < votacion.presentes ? "text-green-600 dark:text-green-400" : "text-red-600/50 dark:text-red-400/50"}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Card de Votos */}
          <div className="bg-card backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-4 md:py-6 border-b border-border">
              <h3 className="text-xl font-semibold">Resultados</h3>
            </div>
            <div className="p-4 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-6 text-center">
                  <span className="block text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{votacion.afirmativos}</span>
                  <span className="text-sm text-muted-foreground font-medium">Afirmativos</span>
                </div>
                <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-6 text-center">
                  <span className="block text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{votacion.negativos}</span>
                  <span className="text-sm text-muted-foreground font-medium">Negativos</span>
                </div>
                <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-6 text-center">
                  <span className="block text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{votacion.abstenciones}</span>
                  <span className="text-sm text-muted-foreground font-medium">Abstenciones</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {Array.from({ length: votacion.afirmativos }).map((_, index) => (
                  <CheckCircle2 key={`affirmative-${index}`} size={16} className="text-green-600 dark:text-green-400" />
                ))}
                {Array.from({ length: votacion.negativos }).map((_, index) => (
                  <XCircle key={`negative-${index}`} size={16} className="text-red-600 dark:text-red-400" />
                ))}
                {Array.from({ length: votacion.abstenciones }).map((_, index) => (
                  <CircleDot key={`abstention-${index}`} size={16} className="text-yellow-600/80 dark:text-yellow-400/80" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold mb-6">Votos individuales</h3>
          <SearchBar votes={votacion.votos} senatorsData={senatorsData} />
        </div>
      </div>
    </main>
  )
}

function SearchBar({ votes, senatorsData }: { votes: any[]; senatorsData: any }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVote, setSelectedVote] = useState<string>("TODOS")
  const [selectedParty, setSelectedParty] = useState<string>("TODOS")

  // Get unique parties from senatorsData
  const uniqueParties = Array.from(new Set(senatorsData.map((senator: Senator) => senator.partido))).sort() as string[]

  const filteredVotes = votes.filter((vote) => {
    const matchesSearch = vote.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVote = selectedVote === "TODOS" || vote.voto.toLowerCase() === selectedVote.toLowerCase()
    const senatorParty = senatorsData.find((senator: Senator) => senator.nombre === vote.nombre)?.partido
    const matchesParty = selectedParty === "TODOS" || senatorParty === selectedParty
    return matchesSearch && matchesVote && matchesParty
  })

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Buscar senador..."
            className="w-full px-4 py-2 pl-11 bg-muted/50 backdrop-blur-sm text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 text-muted-foreground" size={18} />
        </div>
        
        <Select defaultValue="TODOS" value={selectedVote} onValueChange={setSelectedVote}>
          <SelectTrigger className="w-full md:w-[200px] bg-muted/50 border-border rounded-xl">
            <SelectValue placeholder="Todos los votos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los votos</SelectItem>
            <SelectItem value="si">Afirmativo</SelectItem>
            <SelectItem value="no">Negativo</SelectItem>
            <SelectItem value="abstencion">Abstención</SelectItem>
            <SelectItem value="ausente">Ausente</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="TODOS" value={selectedParty} onValueChange={setSelectedParty}>
          <SelectTrigger className="w-full md:w-[200px] bg-muted/50 border-border rounded-xl">
            <SelectValue placeholder="Todos los partidos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los partidos</SelectItem>
            {uniqueParties.map((party) => (
              party ? <SelectItem key={party} value={party}>{party}</SelectItem> : null
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVotes.length > 0 ? (
          filteredVotes.map((vote: any) => (
            <Link 
              href={`/senadores/${encodeURIComponent(vote.nombre)}`}
              key={vote.nombre}
              className="group block transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-5 border border-border transition-all duration-300 group-hover:bg-muted group-hover:border-ring">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar 
                      name={vote.nombre} 
                      imgUrl={senatorsData.find((senator: Senator) => senator.nombre === vote.nombre)?.foto} 
                      size={56} 
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center
                      ${vote.voto.toLowerCase() === "si" 
                        ? "bg-green-100 text-green-600 dark:text-green-400/90 ring-1 ring-green-200 dark:ring-green-400/50" 
                        : vote.voto.toLowerCase() === "no" 
                          ? "bg-red-100  text-red-600 dark:text-red-400/90 ring-1 ring-red-200 dark:ring-red-400/50"
                          : vote.voto.toLowerCase() === "ausente"
                            ? "bg-gray-100 text-gray-600 dark:text-gray-400/90 ring-1 ring-gray-200 dark:ring-gray-400/50"
                            : "bg-yellow-100 text-yellow-600 dark:text-yellow-400/90 ring-1 ring-yellow-200 dark:ring-yellow-400/50"}`}
                    >
                      {vote.voto.toLowerCase() === "si" 
                        ? <CheckCircle2 size={14} /> 
                        : vote.voto.toLowerCase() === "no" 
                          ? <XCircle size={14} />
                          : vote.voto.toLowerCase() === "ausente"
                            ? <Armchair size={14} />
                            : <CircleDot size={14} />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate group-hover:text-foreground/90 transition-colors">
                      {vote.nombre}
                    </h4>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {senatorsData.find((senator: Senator) => senator.nombre === vote.nombre)?.partido || "Sin partido"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                        ${vote.voto.toLowerCase() === "si" 
                          ? "bg-green-100 dark:bg-green-400/10 text-green-600 dark:text-green-400" 
                          : vote.voto.toLowerCase() === "no" 
                            ? "bg-red-100 dark:bg-red-400/10 text-red-600 dark:text-red-400"
                            : vote.voto.toLowerCase() === "ausente"
                              ? "bg-gray-100 dark:bg-gray-400/10 text-gray-600 dark:text-gray-400"
                              : "bg-yellow-100 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"}`}
                      >
                        {vote.voto.toLowerCase() === "si" 
                          ? "Afirmativo"
                          : vote.voto.toLowerCase() === "no"
                            ? "Negativo"
                            : vote.voto.toLowerCase() === "ausente"
                              ? "Ausente"
                              : "Abstención"}
                      </div>
                      
                      {(() => {
                        const partido = senatorsData.find((senator: Senator) => senator.nombre === vote.nombre)?.partido;
                        const logoPath = getPartyLogoPath(partido);
                        return logoPath ? (
                          <div className="relative flex-shrink-0">
                            <Image
                              src={logoPath}
                              alt={`Logo de ${partido}`}
                              width={28}
                              height={28}
                              className="object-contain rounded"
                            />
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-8 bg-muted/50 backdrop-blur-sm rounded-xl border border-border">
            <Search className="text-muted-foreground mb-4" size={48} />
            <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron resultados</h3>
            <p className="text-muted-foreground text-center">
              No hay votos que coincidan con los filtros seleccionados. 
              Intenta ajustar los criterios de búsqueda.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

