"use client";

import { useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";

export interface PaletteItem {
  id: string;
  name: string;
  href: string;
  icon: ReactNode;
}

export interface PaletteSection {
  title: string;
  items: PaletteItem[];
}

interface CommandPaletteProps {
  sections: PaletteSection[];
  currentPage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extra search terms per page (English + Spanish), so "viento" or "crosswind" finds Wind Components
const KEYWORDS: Record<string, string> = {
  home: "inicio start",
  leg: "leg planner tramo pierna heading wca fuel combustible",
  course: "course calculator wind triangle rumbo curso deriva heading wca",
  route: "route distance ruta distancia great circle geodesic",
  planning: "flight planning planificacion vuelo",
  "local-chart": "local chart carta mapa map",
  conditions: "airport conditions metar taf weather clima aerodromo notam",
  argentina: "argentina map mapa aerodromos",
  climb: "climb ascenso trepada descent descenso",
  vstall: "vstall stall perdida bank angle load factor",
  takeoff: "takeoff despegue landing aterrizaje runway pista performance",
  conversions: "unit converter conversion unidades",
  tas: "tas true airspeed velocidad verdadera ias cas",
  isa: "isa density altitude densidad presion pressure qnh temperatura",
  "wind-components": "wind components crosswind headwind tailwind viento cruzado frente cola componentes",
  mach: "mach speed of sound sonido",
  segments: "lnav segments segmentos rhumb loxodromic great circle",
  "sky-art": "sky art gpx dibujo drawing",
  replay: "flight replay 3d gpx garmin video",
  "my-planes": "my planes aircraft aviones avion",
  "flight-plans": "my flight plans planes de vuelo",
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Rank an item for the query: name prefix > name word prefix > name substring > keyword match. 0 = no match. */
function score(item: PaletteItem, query: string): number {
  const name = normalize(item.name);
  const keywords = normalize(KEYWORDS[item.id] ?? "");
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  let total = 0;
  for (const term of terms) {
    if (name.startsWith(term)) total += 4;
    else if (name.split(/\s+/).some((w) => w.startsWith(term))) total += 3;
    else if (name.includes(term)) total += 2;
    else if (keywords.split(/\s+/).some((w) => w.startsWith(term))) total += 1;
    else return 0; // every term must match something
  }
  return total;
}

export function CommandPalette({ sections, currentPage, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Cmd+K / Ctrl+K toggles the palette from anywhere
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!open) {
          setQuery("");
          setActive(0);
        }
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Flat, ranked result list (keeps section order when there's no query)
  const results = useMemo(() => {
    const all = sections.flatMap((s) => s.items.map((item) => ({ item, section: s.title })));
    if (!query.trim()) return all;
    return all
      .map((r, i) => ({ ...r, i, score: score(r.item, query) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.i - b.i);
  }, [sections, query]);

  const close = () => {
    onOpenChange(false);
    setQuery("");
    setActive(0);
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  // Keep the active option visible while moving with the keyboard
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].item.href);
    }
  };

  return (
    <Dialog open={open} onClose={close} className="relative z-50 print:hidden">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]">
        <DialogPanel className="w-full max-w-lg rounded-2xl bg-slate-900 border border-gray-700 shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-700">
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Go to calculator…"
              className="w-full py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-activedescendant={results[active] ? `command-palette-${results[active].item.id}` : undefined}
            />
            <kbd className="hidden sm:block px-1.5 py-0.5 rounded border border-gray-600 text-[10px] font-medium text-gray-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <ul id="command-palette-list" ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
            {results.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">No matches</li>}
            {results.map(({ item, section }, index) => {
              const isActive = index === active;
              const isCurrent = item.id === currentPage;
              return (
                <li
                  key={item.id}
                  id={`command-palette-${item.id}`}
                  data-index={index}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item.href)}
                  className={`mx-2 flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm ${
                    isActive ? "bg-sky-500/20 text-white" : "text-gray-300"
                  }`}
                >
                  <span className={isActive ? "text-sky-400" : "text-gray-400"}>{item.icon}</span>
                  <span className="flex-1 font-medium">{item.name}</span>
                  {isCurrent && <span className="text-xs text-sky-400">Current</span>}
                  <span className="text-xs text-gray-500">{section}</span>
                </li>
              );
            })}
          </ul>

          {/* Footer hints */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-gray-700 text-[11px] text-gray-500">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
