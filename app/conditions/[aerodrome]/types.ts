export interface RunwayEnd {
  id: string;
  heading: number | null;
  elevation: number | null;
  displacedThreshold: number;
  lat: number | null;
  lon: number | null;
}

export interface Runway {
  id: string;
  length: number;
  width: number;
  surface: string;
  surfaceName: string;
  lighted: boolean;
  closed: boolean;
  ends: RunwayEnd[];
}

export interface MetarData {
  icaoId: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  wgst: number | null;
  altim: number | null;
  visib: string | null;
  rawOb: string;
  reportTime: string;
  lat: number;
  lon: number;
  name: string;
  fltCat: string | null;
}

export interface MetarResponse {
  metar: MetarData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
}

export interface OpenMeteoData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
  elevation: number;
}

// Tomorrow.io API types
export interface TomorrowWeatherValues {
  temperature?: number | null;
  temperatureApparent?: number | null;
  humidity?: number | null;
  dewPoint?: number | null;
  windSpeed?: number | null;
  windGust?: number | null;
  windDirection?: number | null;
  pressureSeaLevel?: number | null;
  pressureSurfaceLevel?: number | null;
  visibility?: number | null;
  cloudCover?: number | null;
  cloudBase?: number | null;
  cloudCeiling?: number | null;
  weatherCode?: number | null;
  precipitationProbability?: number | null;
  uvIndex?: number | null;
}

export interface TomorrowHourlyItem {
  time: string;
  values: TomorrowWeatherValues;
}

export interface TomorrowData {
  current: TomorrowWeatherValues;
  hourly: TomorrowHourlyItem[];
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

// TAF types
export interface TafCloud {
  cover: string;
  base: number | null;
  type?: string | null;
}

export interface TafForecast {
  timeFrom: number;
  timeTo: number;
  fcstChange?: string; // FM, BECMG, TEMPO, PROB
  probability?: number;
  wdir?: number | null;
  wspd?: number | null;
  wgst?: number | null;
  visib?: string | null;
  wxString?: string | null;
  clouds?: TafCloud[];
}

export interface TafData {
  icaoId: string;
  lat: number;
  lon: number;
  elev: number;
  name: string;
  rawTAF: string;
  issueTime: string;
  bulletinTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  fcsts: TafForecast[];
  remarks?: string;
}

export interface TafResponse {
  taf: TafData | null;
  source: "direct" | "nearby" | null;
  searchedId?: string;
  distance?: number;
}

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
