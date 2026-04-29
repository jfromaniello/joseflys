import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Mach Explorer | IAS vs TAS vs Mach at Altitude",
    description:
      "Visualize how Indicated Airspeed, True Airspeed and Mach are linked at altitude. Hold IAS or Mach constant and watch the others change as you climb or vary ISA temperature deviation.",
    keywords: [
      "mach explorer",
      "mach calculator",
      "IAS vs TAS vs Mach",
      "airspeed at altitude",
      "high altitude airspeed",
      "compressibility",
      "speed of sound altitude",
      "mach number calculator",
      "CAS to Mach",
      "Mach to TAS",
      "coffin corner",
      "airspeed visualization",
      "ISA deviation airspeed",
    ],
    path: "/mach",
  });
}
