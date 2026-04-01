import { Metadata } from "next";
import { ArgentinaMapClient } from "./ArgentinaMapClient";

export const metadata: Metadata = {
  title: "Argentina - Aerodromos y LADs | JoseFlys",
  description:
    "Mapa interactivo de Argentina con 576 aerodromos (AD) y 892 Lugares Aptos Denunciados (LAD). Encuentra pistas de aterrizaje en todo el pais.",
  openGraph: {
    title: "Argentina - Aerodromos y LADs",
    description:
      "Mapa interactivo con 1468 puntos de aterrizaje en Argentina",
  },
};

export default function ArgentinaPage() {
  return <ArgentinaMapClient />;
}
