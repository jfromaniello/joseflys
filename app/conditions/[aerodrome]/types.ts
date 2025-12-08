// Re-export types from clients
export type { MetarData, MetarResult } from "@/lib/clients/metar";
export type { TafData, TafForecast, TafResult } from "@/lib/clients/taf";
export type { RunwayResponse as Runway } from "@/lib/clients/runways";
export type { OpenMeteoData, OpenMeteoCurrent, OpenMeteoHourly } from "@/lib/clients/open-meteo";
export type { TomorrowValues, TomorrowTimelineItem, TomorrowResult } from "@/lib/clients/tomorrow";
export type { Aerodrome } from "@/lib/clients/aerodromes";

// Import types needed for TomorrowData interface
import type { TomorrowValues, TomorrowTimelineItem } from "@/lib/clients/tomorrow";

// Legacy type aliases for backward compatibility
export type MetarResponse = import("@/lib/clients/metar").MetarResult;
export type TafResponse = import("@/lib/clients/taf").TafResult;
export type TomorrowWeatherValues = TomorrowValues;
export type TomorrowHourlyItem = TomorrowTimelineItem;

export interface TomorrowData {
  current: TomorrowValues | null;
  hourly: TomorrowTimelineItem[];
}

// Weather code descriptions for Tomorrow.io
export const TOMORROW_WEATHER_CODES: Record<number, string> = {
  0: "Unknown",
  1000: "Clear",
  1100: "Mostly Clear",
  1101: "Partly Cloudy",
  1102: "Mostly Cloudy",
  1001: "Cloudy",
  2000: "Fog",
  2100: "Light Fog",
  4000: "Drizzle",
  4001: "Rain",
  4200: "Light Rain",
  4201: "Heavy Rain",
  5000: "Snow",
  5001: "Flurries",
  5100: "Light Snow",
  5101: "Heavy Snow",
  6000: "Freezing Drizzle",
  6001: "Freezing Rain",
  6200: "Light Freezing Rain",
  6201: "Heavy Freezing Rain",
  7000: "Ice Pellets",
  7101: "Heavy Ice Pellets",
  7102: "Light Ice Pellets",
  8000: "Thunderstorm",
};

export const SURFACE_NAMES: Record<string, string> = {
  PG: "Paved (Good)",
  PP: "Paved (Poor)",
  GG: "Grass (Good)",
  GF: "Grass (Fair)",
  GV: "Gravel",
  DT: "Dirt",
  SD: "Sand",
  WT: "Water",
};

// Flight category colors
export const getFlightCatColor = (cat: string | null): string => {
  switch (cat) {
    case "VFR": return "text-green-400 bg-green-400/10 border-green-400/30";
    case "MVFR": return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    case "IFR": return "text-red-400 bg-red-400/10 border-red-400/30";
    case "LIFR": return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/30";
  }
};

// Cloud cover abbreviations
export const CLOUD_COVER: Record<string, string> = {
  SKC: "Clear",
  CLR: "Clear",
  FEW: "Few",
  SCT: "Scattered",
  BKN: "Broken",
  OVC: "Overcast",
  VV: "Vertical Vis",
};

// Weather phenomena
export const WEATHER_PHENOMENA: Record<string, string> = {
  RA: "Rain",
  SN: "Snow",
  DZ: "Drizzle",
  FG: "Fog",
  BR: "Mist",
  HZ: "Haze",
  TS: "Thunderstorm",
  SH: "Showers",
  GR: "Hail",
  GS: "Small Hail",
  FZ: "Freezing",
  "+": "Heavy",
  "-": "Light",
  VC: "Vicinity",
};
