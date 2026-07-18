"use client"

import VotacionCard from "../components/VotacionCard"
import VotacionFilter from "../components/VotacionFilter"
import { useVotaciones } from "../lib/data"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function VotacionesPageClient() {
  const { votaciones, isLoading, isError } = useVotaciones()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedResult, setSelectedResult] = useState(searchParams.get("result") || "TODOS")
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "TODOS")
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [possibleResults, setPossibleResults] = useState<string[]>([])
  const [possibleYears, setPossibleYears] = useState<string[]>([])

  // Update URL parameters when filters change
  const updateUrlParams = (result: string, year: string, search: string) => {
    const params = new URLSearchParams()
    
    if (result !== "TODOS") {
      params.set("result", result)
    }
    
    if (year !== "TODOS") {
      params.set("year", year)
    }
    
    if (search.trim()) {
      params.set("search", search)
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.push(newUrl, { scroll: false })
  }

  // Handle filter changes
  const handleResultChange = (value: string) => {
    setSelectedResult(value)
    updateUrlParams(value, selectedYear, searchQuery)
  }

  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    updateUrlParams(selectedResult, value, searchQuery)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    updateUrlParams(selectedResult, selectedYear, value)
  }

  // Read URL parameters on initial render or when URL changes
  useEffect(() => {
    const result = searchParams.get("result") || "TODOS"
    const year = searchParams.get("year") || "TODOS"
    const search = searchParams.get("search") || ""
    
    setSelectedResult(result)
    setSelectedYear(year)
    setSearchQuery(search)
  }, [searchParams])

  useEffect(() => {
    if (votaciones) {
      const uniqueResults = Array.from(new Set(votaciones.map(v => v.resultado.toUpperCase())))
        .filter(result => result && result.trim() !== '')
        .sort()
      setPossibleResults(uniqueResults)

      const uniqueYears = Array.from(new Set(votaciones.map(v => new Date(v.fecha).getFullYear().toString())))
        .sort((a, b) => b.localeCompare(a)) // Sort years in descending order
      setPossibleYears(uniqueYears)
    }
  }, [votaciones])

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">Todas las Votaciones del Senado</h1>
        <VotacionFilter
          selectedResult={selectedResult}
          selectedYear={selectedYear}
          searchQuery={searchQuery}
          onResultChange={handleResultChange}
          onYearChange={handleYearChange}
          onSearchChange={handleSearchChange}
          possibleResults={[]}
          possibleYears={[]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">No pudimos cargar las votaciones</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
            Hubo un problema al cargar las votaciones del Senado. Esto puede deberse a problemas de conexión o mantenimiento del servidor.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="secondary"
            size="lg"
            className="font-medium"
          >
            Intentar nuevamente
          </Button>
        </div>
      </main>
    )
  }

  if (!votaciones || votaciones.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">Sin Votaciones</h1>
          <p className="text-gray-600 dark:text-gray-400">No hay votaciones disponibles</p>
        </div>
      </main>
    )
  }

  const filteredVotaciones = votaciones.filter((votacion) => {
    const matchesResult = selectedResult === "TODOS" || votacion.resultado.toUpperCase() === selectedResult;
    const votacionYear = new Date(votacion.fecha).getFullYear().toString();
    const matchesYear = selectedYear === "TODOS" || votacionYear === selectedYear;
    
    // Search matching - check in title, project and other relevant fields
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      votacion.titulo.toLowerCase().includes(searchLower) || 
      votacion.proyecto.toLowerCase().includes(searchLower) ||
      votacion.resultado.toLowerCase().includes(searchLower);
    
    return matchesResult && matchesYear && matchesSearch;
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">Todas las Votaciones del Senado</h1>
      <VotacionFilter
        selectedResult={selectedResult}
        selectedYear={selectedYear}
        searchQuery={searchQuery}
        onResultChange={handleResultChange}
        onYearChange={handleYearChange}
        onSearchChange={handleSearchChange}
        possibleResults={possibleResults}
        possibleYears={possibleYears}
      />
      {filteredVotaciones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h2 className="text-2xl font-medium mb-2 text-gray-900 dark:text-gray-100">No se encontraron resultados</h2>
          <p className="text-gray-600 dark:text-gray-400">
            No se encontró ninguna votación. Por favor, intentá con diferentes criterios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVotaciones.map((votacion) => (
            <VotacionCard
              key={votacion.actaId}
              id={votacion.actaId.toString()}
              proyecto={votacion.proyecto}
              titulo={votacion.titulo}
              fecha={votacion.fecha}
              afirmativos={Number(votacion.afirmativos)}
              negativos={Number(votacion.negativos)}
              abstenciones={Number(votacion.abstenciones)}
              resultado={votacion.resultado}
            />
          ))}
        </div>
      )}
    </main>
  )
}

