"use client"

import { useState, useEffect } from "react"
import { useVotaciones, useSenatorsData, Votacion, Senator, Voto, FormaVoto } from "../lib/data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import Image from "next/image"
import { AFINIDAD_CONFIG } from "./config"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

export default function AfinidadPage() {
  const { votaciones, isLoading: votacionesLoading } = useVotaciones()
  const { senatorsData, isLoading: senatorsLoading } = useSenatorsData()
  const [selectedVotaciones, setSelectedVotaciones] = useState<(Votacion & { explanation: string })[]>([])
  const [currentVotacionIndex, setCurrentVotacionIndex] = useState(0)
  const [userVotes, setUserVotes] = useState<Record<number, string>>({})
  const [results, setResults] = useState<{
    senators: { name: string; affinity: number; foto: string; partido: string }[];
    parties: { name: string; affinity: number }[];
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortAscending, setSortAscending] = useState(false)
  const senatorsPerPage = 10

  useEffect(() => {
    if (votaciones) {
      // Filter votaciones based on config
      const configuredVotaciones = AFINIDAD_CONFIG.votacionesIds
        .map(config => {
          const votacion = votaciones.find(v => v.actaId === config.actaId)
          return votacion ? { ...votacion, explanation: config.explanation } : null
        })
        .filter((v): v is (Votacion & { explanation: string }) => v !== null)

      setSelectedVotaciones(configuredVotaciones)
    }
  }, [votaciones])

  const handleVote = (actaId: number, vote: FormaVoto) => {
    const newVotes = { ...userVotes, [actaId]: vote }
    setUserVotes(newVotes)
    
    if (currentVotacionIndex < selectedVotaciones.length - 1) {
      setCurrentVotacionIndex(prev => prev + 1)
    } else if (Object.keys(newVotes).length === selectedVotaciones.length) {
      // Automatically calculate results when all votes are in
      calculateResults()
    }
  }

  const calculateResults = () => {
    if (!senatorsData) return

    const senatorVotes = new Map<string, { total: number; matches: number }>()
    const partyVotes = new Map<string, { total: number; matches: number }>()

    // Calculate matches for each senator
    selectedVotaciones.forEach((votacion) => {
      const userVote = userVotes[votacion.actaId]
      if (!userVote) return

      votacion.votos.forEach((voto: Voto) => {
        // Senator affinity
        const senatorCurrent = senatorVotes.get(voto.nombre) || { total: 0, matches: 0 }
        senatorCurrent.total++
        if (voto.voto === userVote) {
          senatorCurrent.matches++
        }
        senatorVotes.set(voto.nombre, senatorCurrent)

        // Party affinity
        const senator = senatorsData.find((s: Senator) => s.nombre === voto.nombre)
        if (senator) {
          const partyCurrent = partyVotes.get(senator.partido) || { total: 0, matches: 0 }
          partyCurrent.total++
          if (voto.voto === userVote) {
            partyCurrent.matches++
          }
          partyVotes.set(senator.partido, partyCurrent)
        }
      })
    })

    // Calculate percentages with senator details
    const senatorResults = Array.from(senatorVotes.entries())
      .map(([name, { total, matches }]) => {
        const senatorDetails = senatorsData.find(s => s.nombre === name)
        return {
          name,
          affinity: (matches / total) * 100,
          foto: senatorDetails?.foto || "",
          partido: senatorDetails?.partido || "",
        }
      })
      .sort((a, b) => b.affinity - a.affinity)

    const partyResults = Array.from(partyVotes.entries())
      .map(([name, { total, matches }]) => ({
        name,
        affinity: (matches / total) * 100
      }))
      .sort((a, b) => b.affinity - a.affinity)

    setResults({ senators: senatorResults, parties: partyResults })
  }

  if (votacionesLoading || senatorsLoading) {
    return <div className="container mx-auto p-4">Cargando...</div>
  }

  const progressPercentage = (Object.keys(userVotes).length / selectedVotaciones.length) * 100

  return (
    <div className="container mx-auto px-4 py-6 max-w-xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">Test de Afinidad</h1>
      
      {!results ? (
        <>
          <p className="mb-4 text-center text-sm md:text-base">
            Vote en las siguientes votaciones para descubrir con qué senadores y partidos tiene mayor afinidad.
          </p>
          
          <Alert className="mb-6 text-sm">
            <InfoIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <AlertDescription>
              {AFINIDAD_CONFIG.disclaimerText}
            </AlertDescription>
          </Alert>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso</span>
              <span>{Object.keys(userVotes).length} de {selectedVotaciones.length} votaciones</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {selectedVotaciones.length > 0 && (
            <Card className="w-full shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl leading-tight">
                  {selectedVotaciones[currentVotacionIndex].titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm md:text-base">
                    Acta: {selectedVotaciones[currentVotacionIndex].actaId}
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">¿Por qué es importante?</h3>
                    <p className="text-sm text-gray-600">
                      {selectedVotaciones[currentVotacionIndex].explanation}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    variant="default"
                    size="lg"
                    onClick={() => handleVote(selectedVotaciones[currentVotacionIndex].actaId, FormaVoto.AFIRMATIVO)}
                    disabled={userVotes[selectedVotaciones[currentVotacionIndex].actaId] !== undefined}
                  >
                    A favor
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    variant="default"
                    size="lg"
                    onClick={() => handleVote(selectedVotaciones[currentVotacionIndex].actaId, FormaVoto.NEGATIVO)}
                    disabled={userVotes[selectedVotaciones[currentVotacionIndex].actaId] !== undefined}
                  >
                    En contra
                  </Button>
                  <Button
                    className="bg-gray-600 hover:bg-gray-700"
                    variant="default"
                    size="lg"
                    onClick={() => handleVote(selectedVotaciones[currentVotacionIndex].actaId, FormaVoto.ABSTENCION)}
                    disabled={userVotes[selectedVotaciones[currentVotacionIndex].actaId] !== undefined}
                  >
                    Abstención
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between text-sm text-gray-600 pt-3">
                <span>Votación {currentVotacionIndex + 1} de {selectedVotaciones.length}</span>
                {Object.keys(userVotes).length === selectedVotaciones.length && (
                  <Button
                    onClick={calculateResults}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Ver resultados
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Resultados</h2>
            <Button 
              onClick={() => {
                setResults(null)
                setUserVotes({})
                setCurrentVotacionIndex(0)
                if (votaciones) {
                  const configuredVotaciones = AFINIDAD_CONFIG.votacionesIds
                    .map(config => {
                      const votacion = votaciones.find(v => v.actaId === config.actaId)
                      return votacion ? { ...votacion, explanation: config.explanation } : null
                    })
                    .filter((v): v is (Votacion & { explanation: string }) => v !== null)
                  setSelectedVotaciones(configuredVotaciones)
                }
              }}
              variant="outline"
              size="sm"
            >
              Volver a votar
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Afinidad con Partidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.parties.map((party) => (
                  <div key={party.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{party.name}</span>
                      <span className="font-medium">{party.affinity.toFixed(1)}%</span>
                    </div>
                    <Progress value={party.affinity} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Afinidad con Senadores</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortAscending(!sortAscending)}
                className="flex items-center gap-2"
              >
                Ordenar <ArrowUpDown className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.senators
                  .sort((a, b) => sortAscending ? a.affinity - b.affinity : b.affinity - a.affinity)
                  .slice((currentPage - 1) * senatorsPerPage, currentPage * senatorsPerPage)
                  .map((senator) => (
                    <div key={senator.name} className="flex items-center gap-3 pb-3">
                      <div className="flex-shrink-0 w-10 h-10 relative rounded-full overflow-hidden">
                        <Image
                          src={senator.foto}
                          alt={senator.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline mb-1 gap-2">
                          <div className="min-w-0">
                            <span className="font-medium text-sm truncate block">
                              {senator.name}
                            </span>
                            <span className="text-xs text-gray-500 truncate block">
                              {senator.partido}
                            </span>
                          </div>
                          <span className="flex-shrink-0 font-medium text-sm">
                            {senator.affinity.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={senator.affinity} className="h-1.5" />
                      </div>
                    </div>
                  ))}
              </div>
              
              <div className="flex items-center justify-between mt-4 text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-gray-600">
                  {currentPage} de {Math.ceil(results.senators.length / senatorsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(results.senators.length / senatorsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(results.senators.length / senatorsPerPage)}
                  className="flex items-center gap-1"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={() => {
              setResults(null)
              setUserVotes({})
              setCurrentVotacionIndex(0)
              if (votaciones) {
                const configuredVotaciones = AFINIDAD_CONFIG.votacionesIds
                  .map(config => {
                    const votacion = votaciones.find(v => v.actaId === config.actaId)
                    return votacion ? { ...votacion, explanation: config.explanation } : null
                  })
                  .filter((v): v is (Votacion & { explanation: string }) => v !== null)
                setSelectedVotaciones(configuredVotaciones)
              }
            }}
            className="w-full"
          >
            Volver a votar
          </Button>
        </div>
      )}
    </div>
  )
} 