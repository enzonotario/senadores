"use client"

import type React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Avatar from "./Avatar"
import { MapPin, Mail, Phone, Twitter, Instagram, BookOpenText } from "lucide-react"
import { getPartyLogoPath } from "../lib/utils/partyLogos"

type SenadorCardProps = {
  name: string
  totalVotes: number
  affirmativeVotes: number
  negativeVotes: number
  img?: string
  party?: string
  wikipedia_url?: string
  province?: string
  email?: string
  telefono?: string
  twitter?: string
  instagram?: string
}

export default function SenadorCard({
  name,
  totalVotes,
  affirmativeVotes,
  negativeVotes,
  img,
  party,
  wikipedia_url,
  province,
  email,
  telefono,
  twitter,
  instagram,
}: SenadorCardProps) {
  const router = useRouter()
  const affirmativePercentage = ((affirmativeVotes / totalVotes) * 100).toFixed(2)
  const negativePercentage = ((negativeVotes / totalVotes) * 100).toFixed(2)
  const abstentionPercentage = (100 - Number(affirmativePercentage) - Number(negativePercentage)).toFixed(2)
  const partyLogo = getPartyLogoPath(party)

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if the click was on a child anchor tag
    if ((e.target as HTMLElement).closest("a")) return
    router.push(`/senadores/${encodeURIComponent(name)}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-4 mb-4">
        <Avatar name={name} imgUrl={img} size={64} />
        <div className="flex-1">
          <h2 className="text-xl font-bold leading-tight text-gray-900 dark:text-white max-w-[200px] break-words">{name}</h2>
          {party && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">{party}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        {province && (
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center max-w-[250px]">
              <MapPin size={16} className="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="break-words">{province}</span>
            </div>
            {partyLogo && (
                <div className="relative flex-shrink-0">
                  <Image
                    src={partyLogo}
                    alt={`Logo de ${party}`}
                    width={60}
                    height={60}
                    className="object-contain rounded"
                  />
                </div>
              )}
          </div>
        )}
        {email && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Mail size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            {email}
          </div>
        )}
        {telefono && telefono != "(+54 11) 28223000" && ( // (+54 11) 28223000 es el teléfono de la Cámara de Senadores, no del senador
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Phone size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            {telefono}
          </div>
        )}
      </div>

      <div className="flex space-x-4 mb-4">
        {wikipedia_url && (
          <a
            href={wikipedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            <BookOpenText size={20} />
          </a>
        )}
        {twitter && (
          <a
            href={twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Twitter size={20} />
          </a>
        )}
        {instagram && (
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Instagram size={20} />
          </a>
        )}
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-2">Total de votos: {totalVotes}</p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
        <div
          className="h-full"
          style={{
            background: `linear-gradient(to right, 
              #22c55e 0%, 
              #22c55e ${affirmativePercentage}%, 
              #ef4444 ${affirmativePercentage}%, 
              #ef4444 ${Number(affirmativePercentage) + Number(negativePercentage)}%,
              #eab308 ${Number(affirmativePercentage) + Number(negativePercentage)}%,
              #eab308 100%
            )`,
            width: "100%",
          }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-green-700 dark:text-green-400">Afirmativo: {affirmativePercentage}%</span>
        <span className="text-red-700 dark:text-red-400">Negativo: {negativePercentage}%</span>
      </div>
    </div>
  )
}

