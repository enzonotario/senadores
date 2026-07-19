"use client"

import { useState, useEffect } from "react"
import SenadorCard from "../components/SenadorCard"
import { getVotaciones, getSenatorsData } from "../lib/data"
import { Search } from "lucide-react"

async function getSenadores() {
  const votaciones = await getVotaciones()
  const senadores: { [key: string]: { total: number; affirmative: number; negative: number } } = {}

  votaciones.forEach((votacion: any) => {
    votacion.votes.forEach((vote: any) => {
      if (!senadores[vote.name]) {
        senadores[vote.name] = { total: 0, affirmative: 0, negative: 0 }
      }
      senadores[vote.name].total++
      if (vote.vote === "SI") senadores[vote.name].affirmative++
      if (vote.vote === "NO") senadores[vote.name].negative++
    })
  })

  return Object.entries(senadores).map(([name, stats]) => ({
    name,
    totalVotes: stats.total,
    affirmativeVotes: stats.affirmative,
    negativeVotes: stats.negative,
  }))
}

export default function SenadoresPage() {
  const [senadores, setSenadores] = useState<any[]>([])
  const [senatorsData, setSenatorsData] = useState<any>({})
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const senadoresData = await getSenadores()
      const senatorsImageData = await getSenatorsData()
      setSenadores(senadoresData)
      setSenatorsData(senatorsImageData)
    }
    fetchData()
  }, [])

  const filteredSenadores = senadores.filter((senador) => senador.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Senadores</h1>
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Buscar senador..."
          className="w-full p-2 pl-10 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSenadores.map((senador) => (
          <SenadorCard
            key={senador.name}
            name={senador.name}
            totalVotes={senador.totalVotes}
            affirmativeVotes={senador.affirmativeVotes}
            negativeVotes={senador.negativeVotes}
            imgUrl={senatorsData[senador.name]}
          />
        ))}
      </div>
    </main>
  )
}

