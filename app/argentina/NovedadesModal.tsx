"use client";

import { Fragment } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

interface FeaturedEntry {
  codigo: string;
  nombre: string;
  provincia: string;
  lat: number;
  lon: number;
  why: string;
}

interface Section {
  icon: string;
  title: string;
  intro: string;
  entries: FeaturedEntry[];
}

// Curated picks from the Feb-2026 ANAC LAD listing. The "why" lines explain
// what makes each one notable so the user understands the context.
const SECTIONS: Section[] = [
  {
    icon: "🏔️",
    title: "Pistas de gran altura",
    intro:
      "Los aeródromos a mayor elevación del país. Varios sirven operaciones mineras en la Puna (litio, oro).",
    entries: [
      {
        codigo: "3110",
        nombre: "BATIDERO",
        provincia: "La Rioja",
        lat: -28.4811,
        lon: -69.4756,
        why: "El más alto del listado: 4178 m de elevación.",
      },
      {
        codigo: "3017",
        nombre: "RATONES OESTE II",
        provincia: "Salta",
        lat: -25.2067,
        lon: -66.9653,
        why: "4023 m de altura, pista de tierra de 3000 m de largo.",
      },
      {
        codigo: "2278",
        nombre: "FENIX (SALAR HOMBRE MUERTO)",
        provincia: "Catamarca",
        lat: -25.4958,
        lon: -67.0869,
        why: "3985 m, 2885 m de pista. Operaciones de litio en el salar.",
      },
    ],
  },
  {
    icon: "🛬",
    title: "LADs pavimentados nuevos",
    intro:
      "Casi todos los LADs son de tierra. Estos tres tienen pista asfaltada y de tamaño operacional serio.",
    entries: [
      {
        codigo: "5491",
        nombre: "JACHAL",
        provincia: "San Juan",
        lat: -30.2194,
        lon: -68.7375,
        why: "1280 m de asfalto a 1183 m de elevación.",
      },
      {
        codigo: "2987",
        nombre: "INGENIERO JUAREZ",
        provincia: "Formosa",
        lat: -23.9058,
        lon: -61.82,
        why: "1500 m de asfalto en el oeste formoseño.",
      },
      {
        codigo: "2954",
        nombre: "MANOGASTA",
        provincia: "Santiago del Estero",
        lat: -28.0536,
        lon: -64.0964,
        why: "1453 m de asfalto.",
      },
    ],
  },
  {
    icon: "🛩️",
    title: "Multi-pista",
    intro:
      "Aeródromos con pista principal + secundaria registrada (ideal para operar con distintos vientos).",
    entries: [
      {
        codigo: "3114",
        nombre: "HANGARES DE LOBOS",
        provincia: "Buenos Aires",
        lat: -35.3039,
        lon: -59.2103,
        why: "Dos pistas perpendiculares: 18/36 (680 m) y 14/32 (547 m).",
      },
      {
        codigo: "2813",
        nombre: "EA. LA ESMERALDA",
        provincia: "Santa Fe",
        lat: -29.6464,
        lon: -61.7572,
        why: "Pista principal 1190×50 y secundaria 1950×50.",
      },
      {
        codigo: "2891",
        nombre: "LA MATILDE",
        provincia: "La Pampa",
        lat: -37.9172,
        lon: -64.9139,
        why: "Dos pistas paralelas: 1990 m y 1405 m, ambas 17/35.",
      },
    ],
  },
  {
    icon: "🚁",
    title: "Helipuertos institucionales",
    intro:
      "Cluster nuevo del Gobierno de Mendoza, un hospital de alta complejidad y servicios de emergencia/policía.",
    entries: [
      {
        codigo: "3229",
        nombre: "ÑACUÑAN / GOBIERNO DE MENDOZA",
        provincia: "Mendoza",
        lat: -34.0464,
        lon: -67.9514,
        why: "Uno de los tres helipuertos provinciales de Mendoza (concreto, 20×20).",
      },
      {
        codigo: "3233",
        nombre: "LA PAZ / GOBIERNO DE MENDOZA",
        provincia: "Mendoza",
        lat: -33.4536,
        lon: -67.56,
        why: "Cluster Mendoza — operaciones gubernamentales.",
      },
      {
        codigo: "3241",
        nombre: "MONTE COMAN / GOBIERNO DE MENDOZA",
        provincia: "Mendoza",
        lat: -34.5764,
        lon: -67.8664,
        why: "Tercer helipuerto del cluster provincial.",
      },
      {
        codigo: "3112",
        nombre: "HOSPITAL SAMIC EL CALAFATE",
        provincia: "Santa Cruz",
        lat: -50.3347,
        lon: -72.2375,
        why: "Helipuerto del hospital de alta complejidad en la Patagonia.",
      },
      {
        codigo: "2296",
        nombre: "ESCUELA MILITAR DE MONTAÑA",
        provincia: "Río Negro",
        lat: -41.12,
        lon: -71.41,
        why: "Centro de instrucción militar de montaña.",
      },
    ],
  },
  {
    icon: "🛢️",
    title: "Cluster Tierra del Fuego",
    intro:
      "Seis pistas nuevas con nomenclatura AREA TDF-H1 a H6 — probable apoyo a operaciones hidrocarburíferas.",
    entries: [
      {
        codigo: "2907",
        nombre: "AREA TDF-H1",
        provincia: "Tierra del Fuego",
        lat: -54.6792,
        lon: -68.3003,
        why: "Primera de la serie TDF — pistas grandes (2000 m) en el sur fueguino.",
      },
    ],
  },
  {
    icon: "🌎",
    title: "Patagonia profunda",
    intro:
      "Pistas en lugares emblemáticos de la Patagonia, registradas oficialmente por primera vez.",
    entries: [
      {
        codigo: "5138",
        nombre: "EL CHALTEN",
        provincia: "Santa Cruz",
        lat: -49.5336,
        lon: -72.5278,
        why: "1000 m de tierra a 43 km al SE de El Chaltén.",
      },
      {
        codigo: "778",
        nombre: "EA. MONTE DINERO",
        provincia: "Santa Cruz",
        lat: -52.3,
        lon: -68.5333,
        why: "Una de las pistas más australes del continente: 91 km al SSE de Río Gallegos.",
      },
    ],
  },
  {
    icon: "🎈",
    title: "Curiosidad: único LADA",
    intro: "El listado tiene un solo Lugar Apto Denunciado Auxiliar (LADA).",
    entries: [
      {
        codigo: "2918",
        nombre: "BALLOON FEST",
        provincia: "Buenos Aires",
        lat: -34.3006,
        lon: -58.9747,
        why: "Pista cuadrada de 240×100 m — para eventos de globos aerostáticos.",
      },
    ],
  },
];

interface NovedadesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFocusEntry: (codigo: string, lat: number, lon: number) => void;
}

export function NovedadesModal({
  isOpen,
  onClose,
  onFocusEntry,
}: NovedadesModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[10000]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl transition-all my-8">
                <div className="bg-gradient-to-r from-amber-600/20 via-blue-600/20 to-amber-600/20 px-6 py-5 border-b border-slate-700">
                  <DialogTitle className="text-2xl font-bold text-white">
                    Novedades del Listado LAD - Febrero 2026
                  </DialogTitle>
                  <p className="text-sm text-slate-300 mt-2">
                    La ANAC actualizó el listado tras 5 años. <strong className="text-amber-300">+365 LADs nuevos</strong>, 14 dados de baja, 973 en total. Acá una selección curada de los más interesantes:
                  </p>
                </div>

                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                  {SECTIONS.map((section) => (
                    <section key={section.title} className="mb-6 last:mb-0">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-1">
                        <span aria-hidden>{section.icon}</span>
                        {section.title}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3">{section.intro}</p>
                      <ul className="space-y-2">
                        {section.entries.map((entry) => (
                          <li key={entry.codigo}>
                            <button
                              onClick={() => {
                                onFocusEntry(entry.codigo, entry.lat, entry.lon);
                                onClose();
                              }}
                              className="w-full text-left px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/60 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="font-medium text-amber-300 group-hover:text-amber-200">
                                  {entry.nombre}
                                </span>
                                <span className="text-xs text-slate-400 shrink-0">
                                  cod. {entry.codigo} · {entry.provincia}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300">{entry.why}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/80 flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    Fuente: ANAC - Listado de Lugares Aptos Denunciados (Feb 2026)
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm cursor-pointer transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
