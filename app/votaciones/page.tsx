import type { Metadata } from "next";
import { Suspense } from "react";
import VotacionesPageClient from "./VotacionesPageClient";

export const metadata: Metadata = {
  title: "Votaciones",
  description:
    "Consulta todas las votaciones realizadas en el Senado de la Nación Argentina, filtra por fecha, tipo y resultado.",
  openGraph: {
    title: "Votaciones | Senado Argentino",
    description:
      "Consulta todas las votaciones realizadas en el Senado de la Nación Argentina, filtra por fecha, tipo y resultado.",
    images: [
      {
        url: "/meta-image.png",
        width: 1200,
        height: 630,
        alt: "Votaciones del Senado Argentino"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Votaciones | Senado Argentino",
    description:
      "Consulta todas las votaciones realizadas en el Senado de la Nación Argentina, filtra por fecha, tipo y resultado.",
    images: ["/meta-image.png"]
  }
};

export default function VotacionesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Suspense fallback={<div>Cargando votaciones...</div>}>
        <VotacionesPageClient />
      </Suspense>
    </div>
  );
}
