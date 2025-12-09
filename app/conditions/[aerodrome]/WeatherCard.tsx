import { OpenMeteoData, TomorrowData } from "./types";
import { calculatePA, calculateDA, calculateISATemp } from "@/lib/isaCalculations";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

interface WeatherCardProps {
  openMeteo: OpenMeteoData | null;
  tomorrow: TomorrowData | null;
  loading: boolean;
  elevation?: number | null;
}

// SVG Icons for aviation weather
const VisibilityIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

const CloudBaseIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.5 13H9a5 5 0 1 1 4.79-6.5h2.71a3.5 3.5 0 1 1 0 6.5Z" />
    <path d="M6 17h12M8 21h8" strokeLinecap="round" />
  </svg>
);

const CeilingIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 7h18M3 3h18" strokeLinecap="round" />
    <path d="M17.5 19H9a5 5 0 1 1 4.79-6.5h2.71a3.5 3.5 0 1 1 0 6.5Z" />
  </svg>
);

const ThermometerIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
  </svg>
);

const WindIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" strokeLinecap="round" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" strokeLinecap="round" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" strokeLinecap="round" />
  </svg>
);

const PressureIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
  </svg>
);

const HumidityIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

// Altitude Icon for PA/DA
const AltitudeIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function WeatherCard({ openMeteo, tomorrow, loading, elevation }: WeatherCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Online Weather</h2>
        <div className="text-slate-400 text-center py-8">Loading weather data...</div>
      </div>
    );
  }

  if (!openMeteo && !tomorrow) {
    return null;
  }

  // Get Tomorrow.io data (preferred source)
  const tw = tomorrow?.current;
  const twHourly = tomorrow?.hourly || [];
  const hasTomorrowData = tw && Object.keys(tw).length > 0;

  // Aviation data (only from Tomorrow.io)
  const visibility = tw?.visibility;
  const cloudCover = tw?.cloudCover;
  const cloudBase = tw?.cloudBase;
  const ceiling = tw?.cloudCeiling;

  // Current conditions - prefer Tomorrow.io, fallback to Open-Meteo
  const temperature = hasTomorrowData ? tw?.temperature : openMeteo?.current.temperature_2m;
  const temperatureApparent = hasTomorrowData ? tw?.temperatureApparent : openMeteo?.current.apparent_temperature;
  const humidity = hasTomorrowData ? tw?.humidity : openMeteo?.current.relative_humidity_2m;
  const pressure = hasTomorrowData ? tw?.pressureSeaLevel : openMeteo?.current.surface_pressure;

  // Calculate PA and DA from online weather
  const pressureAltitude = pressure && elevation != null
    ? Math.round(calculatePA(elevation, pressure))
    : null;

  const densityAltitude = pressureAltitude != null && temperature != null && elevation != null
    ? Math.round(calculateDA(pressureAltitude, temperature, calculateISATemp(elevation)))
    : null;

  // Wind - Tomorrow.io returns m/s, convert to knots
  let windSpeed: number | null | undefined;
  let windGust: number | null | undefined;
  let windDirection: number | null | undefined;

  if (hasTomorrowData && tw?.windSpeed !== null && tw?.windSpeed !== undefined) {
    windSpeed = Math.round(tw.windSpeed * 1.94384);
    windGust = tw?.windGust ? Math.round(tw.windGust * 1.94384) : null;
    windDirection = tw?.windDirection ? Math.round(tw.windDirection) : null;
  } else if (openMeteo) {
    windSpeed = Math.round(openMeteo.current.wind_speed_10m);
    windGust = openMeteo.current.wind_gusts_10m > openMeteo.current.wind_speed_10m
      ? Math.round(openMeteo.current.wind_gusts_10m) : null;
    windDirection = Math.round(openMeteo.current.wind_direction_10m);
  }

  // Format visibility
  const formatVisibility = (vis: number | null | undefined) => {
    if (vis === null || vis === undefined) return null;
    if (vis >= 10) return "10+ km";
    return `${vis.toFixed(1)} km`;
  };

  // Format cloud height (km to ft)
  const formatHeight = (height: number | null | undefined) => {
    if (height === null || height === undefined) return null;
    const feet = Math.round(height * 3280.84);
    return `${feet.toLocaleString()} ft`;
  };

  // Get visibility color based on flight category
  const getVisibilityColor = (vis: number | null | undefined) => {
    if (vis === null || vis === undefined) return "text-slate-400";
    if (vis >= 8) return "text-green-400"; // VFR
    if (vis >= 5) return "text-blue-400";  // MVFR
    if (vis >= 1.5) return "text-red-400"; // IFR
    return "text-purple-400"; // LIFR
  };

  // Get ceiling color based on flight category
  const getCeilingColor = (height: number | null | undefined) => {
    if (height === null || height === undefined) return "text-slate-400";
    const feet = height * 3280.84;
    if (feet >= 3000) return "text-green-400"; // VFR
    if (feet >= 1000) return "text-blue-400";  // MVFR
    if (feet >= 500) return "text-red-400";    // IFR
    return "text-purple-400"; // LIFR
  };

  // Determine which hourly data to use
  const usesTomorrowHourly = twHourly.length > 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">Online Weather</h2>

      <div className="space-y-4">
        {/* Aviation Critical Data - from Tomorrow.io only */}
        {hasTomorrowData && (visibility !== null || cloudBase !== null || ceiling !== null) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Visibility */}
            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <div className={`flex justify-center mb-2 ${getVisibilityColor(visibility)}`}>
                <VisibilityIcon />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Visibility</div>
              <div className={`text-xl font-bold ${getVisibilityColor(visibility)}`}>
                {formatVisibility(visibility) || "N/A"}
              </div>
            </div>

            {/* Cloud Cover */}
            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <div className="flex justify-center mb-2 text-slate-300">
                <CloudIcon />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cloud Cover</div>
              <div className="text-xl font-bold text-white">
                {cloudCover !== null && cloudCover !== undefined ? `${Math.round(cloudCover)}%` : "N/A"}
              </div>
            </div>

            {/* Cloud Base */}
            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <div className="flex justify-center mb-2 text-sky-400">
                <CloudBaseIcon />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cloud Base</div>
              <div className="text-xl font-bold text-sky-400">
                {formatHeight(cloudBase) || "CLR"}
              </div>
            </div>

            {/* Ceiling */}
            <div className="bg-slate-900/50 rounded-xl p-4 text-center border border-slate-700/50">
              <div className={`flex justify-center mb-2 ${getCeilingColor(ceiling)}`}>
                <CeilingIcon />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ceiling</div>
              <div className={`text-xl font-bold ${getCeilingColor(ceiling)}`}>
                {formatHeight(ceiling) || "UNL"}
              </div>
            </div>
          </div>
        )}

        {/* Current Conditions */}
        {(temperature !== null && temperature !== undefined) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Row 1: Temperature, Wind, Humidity */}
            {/* Temperature */}
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
              <div className="text-amber-400">
                <ThermometerIcon />
              </div>
              <div>
                <div className="text-xs text-slate-400">Temperature</div>
                <div className="text-white font-medium">{temperature?.toFixed(1)}°C</div>
                {temperatureApparent !== null && temperatureApparent !== undefined && (
                  <div className="text-xs text-slate-500">
                    Feels {temperatureApparent.toFixed(1)}°C
                  </div>
                )}
              </div>
            </div>

            {/* Wind */}
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
              <div className="text-sky-400">
                <WindIcon />
              </div>
              <div>
                <div className="text-xs text-slate-400">Wind</div>
                <div className="text-white font-medium">
                  {windDirection !== null && windDirection !== undefined
                    ? `${String(windDirection).padStart(3, "0")}°` : "VRB"} / {windSpeed ?? 0} KT
                </div>
                {windGust && windGust > (windSpeed || 0) && (
                  <div className="text-xs text-amber-400">G{windGust} KT</div>
                )}
              </div>
            </div>

            {/* Humidity */}
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
              <div className="text-blue-400">
                <HumidityIcon />
              </div>
              <div>
                <div className="text-xs text-slate-400">Humidity</div>
                <div className="text-white font-medium">
                  {humidity !== null && humidity !== undefined ? `${Math.round(humidity)}%` : "N/A"}
                </div>
              </div>
            </div>

            {/* Row 2: Pressure, Pressure Altitude, Density Altitude */}
            {/* Pressure */}
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
              <div className="text-emerald-400">
                <PressureIcon />
              </div>
              <div>
                <div className="text-xs text-slate-400">Pressure</div>
                <div className="text-white font-medium">
                  {pressure !== null && pressure !== undefined ? `${Math.round(pressure)} hPa` : "N/A"}
                </div>
              </div>
            </div>

            {/* Pressure Altitude */}
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
              <div className="text-violet-400">
                <AltitudeIcon />
              </div>
              <div>
                <div className="text-xs text-slate-400">Pressure Alt</div>
                <div className="text-white font-medium">
                  {pressureAltitude !== null ? `${pressureAltitude.toLocaleString()} ft` : "N/A"}
                </div>
                {elevation != null && (
                  <div className="text-xs text-slate-500">Field: {elevation.toLocaleString()} ft</div>
                )}
              </div>
            </div>

            {/* Density Altitude */}
            <div className="bg-slate-900/30 rounded-lg p-3 flex items-center gap-3">
              <div className={
                densityAltitude !== null && densityAltitude > 8000
                  ? "text-red-400"
                  : densityAltitude !== null && densityAltitude > 6000
                  ? "text-amber-400"
                  : "text-orange-400"
              }>
                <AltitudeIcon />
              </div>
              <div>
                <div className="text-xs text-slate-400">Density Alt</div>
                <div className={`font-medium ${
                  densityAltitude !== null && densityAltitude > 8000
                    ? "text-red-400"
                    : densityAltitude !== null && densityAltitude > 6000
                    ? "text-amber-400"
                    : "text-white"
                }`}>
                  {densityAltitude !== null ? `${densityAltitude.toLocaleString()} ft` : "N/A"}
                </div>
                {densityAltitude !== null && pressureAltitude !== null && (
                  <div className="text-xs text-slate-500">
                    {densityAltitude > pressureAltitude ? "+" : ""}{(densityAltitude - pressureAltitude).toLocaleString()} ft ISA dev
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hourly Forecast Chart */}
        {(usesTomorrowHourly || openMeteo) && (
          <div className="bg-slate-900/30 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-3 uppercase tracking-wide">12-Hour Forecast</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={(() => {
                    if (usesTomorrowHourly) {
                      return twHourly.slice(0, 12).map((item) => ({
                        hour: `${String(new Date(item.time).getHours()).padStart(2, "0")}h`,
                        temp: item.values.temperature != null ? Math.round(item.values.temperature) : null,
                        wind: item.values.windSpeed != null ? Math.round(item.values.windSpeed * 1.94384) : null,
                        clouds: item.values.cloudCover != null ? Math.round(item.values.cloudCover) : null,
                      }));
                    } else if (openMeteo) {
                      return openMeteo.hourly.time.slice(0, 12).map((time, i) => ({
                        hour: `${String(new Date(time).getHours()).padStart(2, "0")}h`,
                        temp: Math.round(openMeteo.hourly.temperature_2m[i]),
                        wind: Math.round(openMeteo.hourly.wind_speed_10m[i]),
                        clouds: openMeteo.hourly.cloud_cover[i],
                      }));
                    }
                    return [];
                  })()}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="left"
                    stroke="#F59E0B"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}°`}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <YAxis
                    yAxisId="wind"
                    orientation="right"
                    stroke="#38BDF8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    domain={[0, 'dataMax + 5']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#F1F5F9', fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'temp') return [`${value}°C`, 'Temperature'];
                      if (name === 'wind') return [`${value} kt`, 'Wind'];
                      if (name === 'clouds') return [`${value}%`, 'Clouds'];
                      return [value, name];
                    }}
                  />
                  {/* Cloud cover as background area */}
                  <Area
                    yAxisId="temp"
                    type="stepAfter"
                    dataKey="clouds"
                    stroke="none"
                    fill="#94A3B8"
                    fillOpacity={0.15}
                    name="clouds"
                  />
                  {/* Temperature line */}
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temp"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#F59E0B' }}
                    name="temp"
                  />
                  {/* Wind line */}
                  <Line
                    yAxisId="wind"
                    type="monotone"
                    dataKey="wind"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    dot={{ fill: '#38BDF8', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#38BDF8' }}
                    name="wind"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-amber-500 rounded"></div>
                <span className="text-slate-400">Temperature (°C)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-sky-400 rounded"></div>
                <span className="text-slate-400">Wind (kt)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-slate-400/20 rounded"></div>
                <span className="text-slate-400">Clouds</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
