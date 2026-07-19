"use client"

import Link from "next/link"
import Image from "next/image"

export default function Hero() {
  return (
    <div className="relative h-[600px] overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-repeat"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          backgroundPosition: "top center",
        }}
      ></div>
      <div className="absolute inset-0">
        <Image
          src="https://i.imgur.com/XCxilQt.jpeg"
          alt="Congreso de la Nación Argentina"
          fill
          className="object-cover object-bottom"
          priority
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold mb-4 text-white">Votaciones del Senado Argentino</h1>
          <p className="text-xl mb-8 text-gray-200">
            Explora y analiza las votaciones de los proyectos en el Senado de la Nación
          </p>
          <div className="flex space-x-4">
            <Link
              href="/votaciones"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 shadow-lg hover:shadow-xl"
            >
              Ver Votaciones
            </Link>
            <Link
              href="/senadores"
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 shadow-lg hover:shadow-xl"
            >
              Ver Senadores
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

