export interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  cloud_cover: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  cloud_cover: number[];
  cloud_cover_low: number[];
  cloud_cover_mid: number[];
  cloud_cover_high: number[];
  visibility: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
}

export interface OpenMeteoData {
  current: OpenMeteoCurrent;
  hourly: OpenMeteoHourly;
  current_units: Record<string, string>;
  hourly_units: Record<string, string>;
}

/**
 * Fetch weather data from Open-Meteo
 *
 * @param lat - Latitude
 * @param lon - Longitude
 */
export async function fetchOpenMeteo(
  lat: number,
  lon: number
): Promise<OpenMeteoData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_direction_10m&forecast_days=1&wind_speed_unit=kn`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error("Open-Meteo API error:", response.status);
      return null;
    }

    const data: OpenMeteoData = await response.json();
    return data;
  } catch (error) {
    console.error("Open-Meteo fetch error:", error);
    return null;
  }
}
