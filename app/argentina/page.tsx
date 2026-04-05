import { Metadata } from "next";
import { Suspense } from "react";
import { ArgentinaMapClient } from "./ArgentinaMapClient";

interface Props {
  searchParams: Promise<{ q?: string; map?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q;

  const baseTitle = "Argentina - Aerodromos y LADs";
  const baseDescription = "Mapa interactivo de Argentina con 576 aerodromos (AD) y 892 Lugares Aptos Denunciados (LAD). Encuentra pistas de aterrizaje en todo el pais.";

  if (query) {
    return {
      title: `${query} | ${baseTitle} | JoseFlys`,
      description: `Busqueda: "${query}" - ${baseDescription}`,
      openGraph: {
        title: `Busqueda: ${query}`,
        description: `Resultados de "${query}" en el mapa de aerodromos de Argentina`,
      },
    };
  }

  return {
    title: `${baseTitle} | JoseFlys`,
    description: baseDescription,
    openGraph: {
      title: baseTitle,
      description: "Mapa interactivo con 1468 puntos de aterrizaje en Argentina",
    },
  };
}

export default function ArgentinaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando...</div>}>
      <ArgentinaMapClient />
    </Suspense>
  );
}
