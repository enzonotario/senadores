import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navigation from "./components/Navigation"
import Footer from "./components/Footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    template: '%s | Senado Argentino',
    default: 'Senado Argentino'
  },
  description: "Portal de transparencia y análisis de votaciones del Senado de la Nación Argentina",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: {
      template: '%s | Senado Argentino',
      default: 'Senado Argentino'
    },
    description: 'Portal de transparencia y análisis de votaciones del Senado de la Nación Argentina',
    images: [{
      url: '/meta-image.png',
      width: 1200,
      height: 630,
      alt: 'Senado Argentino'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      template: '%s | Senado Argentino',
      default: 'Senado Argentino'
    },
    description: 'Portal de transparencia y análisis de votaciones del Senado de la Nación Argentina',
    images: ['/meta-image.png'],
  },
  metadataBase: new URL('https://senadores.argentinadatos.com'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-gray-900 text-gray-100 min-h-screen flex flex-col`}>
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}



import './globals.css'