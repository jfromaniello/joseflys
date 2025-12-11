import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { fetchMetar, getAerodromeByCode, getRunways } from '@/lib/clients';
import { selectBestRunway } from '@/lib/runwayUtils';
import { getSunTimes, isVfrLegal, getDaylightPhase } from '@/lib/sun';
import { calculatePA, calculateDA, calculateISATemp } from '@/lib/isaCalculations';

// export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return new Response('Missing code parameter', { status: 400 });
    }

    // Fetch aerodrome info
    const aerodrome = getAerodromeByCode(code);
    const runwaysData = getRunways(code);

    // Fetch METAR
    const metarResult = await fetchMetar(code, aerodrome?.lat, aerodrome?.lon);
    const metar = metarResult.metar;

    // Calculate best runway
    const bestRunway = metar && runwaysData.runways.length > 0
      ? selectBestRunway(runwaysData.runways, metar.wdir, metar.wspd)
      : null;

    // Calculate sun position for day/night indication
    const now = new Date();
    const sunTimes = aerodrome ? getSunTimes(aerodrome.lat, aerodrome.lon, now) : null;
    const vfrLegal = sunTimes ? isVfrLegal(sunTimes, now) : true;
    const daylightPhase = sunTimes ? getDaylightPhase(sunTimes, now) : 'day';
    const isNight = daylightPhase === 'night';

    // Calculate PA and DA
    const elevation = aerodrome?.elevation ?? null;
    const pressureAltitude = metar?.altim && elevation != null
      ? Math.round(calculatePA(elevation, metar.altim))
      : null;
    const densityAltitude = pressureAltitude != null && metar?.temp != null && elevation != null
      ? Math.round(calculateDA(pressureAltitude, metar.temp, calculateISATemp(elevation)))
      : null;
    const daWarning = densityAltitude !== null && pressureAltitude !== null &&
      (densityAltitude - pressureAltitude > 1000 || densityAltitude > 5000);

    // Format wind string
    const windStr = metar && metar.wdir !== null && metar.wspd !== null
      ? `${String(metar.wdir).padStart(3, '0')}°/${metar.wspd}${metar.wgst ? `G${metar.wgst}` : ''} kt`
      : 'Calm';

    // Format visibility
    const formatVisibility = (visib: string | null) => {
      if (!visib) return null;
      const v = visib.trim();
      if (v === 'P6SM' || v === '6+') return '>10 km';
      const simpleMatch = v.match(/^(\d+(?:\.\d+)?)\s*SM$/i);
      if (simpleMatch) {
        const sm = parseFloat(simpleMatch[1]);
        const km = sm * 1.60934;
        return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
      }
      return v;
    };
    const visibilityStr = formatVisibility(metar?.visib ?? null);

    // Flight category color and label
    const showNightWarning = isNight && (metar?.fltCat === 'VFR' || metar?.fltCat === 'MVFR');
    const fltCatLabel = showNightWarning ? 'Night' : metar?.fltCat;
    const fltCatColor = showNightWarning ? '#fbbf24'
      : metar?.fltCat === 'VFR' ? '#4ade80'
      : metar?.fltCat === 'MVFR' ? '#60a5fa'
      : metar?.fltCat === 'IFR' ? '#f87171'
      : metar?.fltCat === 'LIFR' ? '#c084fc'
      : '#94a3b8';
    const fltCatBg = showNightWarning ? 'rgba(251, 191, 36, 0.15)'
      : metar?.fltCat === 'VFR' ? 'rgba(74, 222, 128, 0.15)'
      : metar?.fltCat === 'MVFR' ? 'rgba(96, 165, 250, 0.15)'
      : metar?.fltCat === 'IFR' ? 'rgba(248, 113, 113, 0.15)'
      : metar?.fltCat === 'LIFR' ? 'rgba(192, 132, 252, 0.15)'
      : 'rgba(148, 163, 184, 0.15)';

    // Wind rose dimensions
    const roseSize = 260;
    const center = roseSize / 2;
    const outerRadius = roseSize * 0.42;
    const innerRadius = roseSize * 0.28;
    const runwayLength = roseSize * 0.7;
    const runwayWidth = roseSize * 0.1;
    const runwayRotation = bestRunway?.heading ?? 0;
    const windRotation = metar?.wdir ?? null;

    // Runway info string
    const runwayStr = bestRunway
      ? `${bestRunway.headwind >= 0 ? '+' : ''}${bestRunway.headwind} HW${bestRunway.crosswind > 0 ? ` / ${bestRunway.crosswind} XW` : ''}`
      : '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(to bottom right, #0f172a 0%, #172554 50%, #0f172a 100%)',
            fontFamily: 'system-ui, sans-serif',
            padding: '48px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Airport name - main title */}
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {aerodrome?.name || code}
              </div>
              {/* Code */}
              <div style={{ display: 'flex', fontSize: '24px', color: '#64748b' }}>
                {code}
              </div>
            </div>
            {/* Flight Category Badge */}
            {fltCatLabel && (
              <div
                style={{
                  display: 'flex',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: fltCatColor,
                  padding: '8px 20px',
                  borderRadius: '24px',
                  background: fltCatBg,
                  border: `2px solid ${fltCatColor}50`,
                }}
              >
                {fltCatLabel}
              </div>
            )}
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flex: 1 }}>
            {/* Left side - Wind Rose */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '340px',
              }}
            >
              {/* Recommended Runway - smaller, above wind rose */}
              {bestRunway && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', fontSize: '12px', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Recommended
                  </div>
                  <div style={{ display: 'flex', fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                    RWY {bestRunway.endId}
                  </div>
                  <div style={{ display: 'flex', fontSize: '14px', color: '#94a3b8' }}>
                    {runwayStr}
                  </div>
                </div>
              )}

              {/* Wind Rose SVG */}
              <svg width={roseSize} height={roseSize} viewBox={`0 0 ${roseSize} ${roseSize}`}>
                {/* Outer circle */}
                <circle
                  cx={center}
                  cy={center}
                  r={outerRadius}
                  fill="none"
                  stroke="rgba(71, 85, 105, 0.6)"
                  strokeWidth="1"
                />

                {/* Inner circle */}
                <circle
                  cx={center}
                  cy={center}
                  r={innerRadius}
                  fill="rgba(15, 23, 42, 0.5)"
                  stroke="rgba(71, 85, 105, 0.4)"
                  strokeWidth="1"
                />

                {/* Compass tick marks and labels */}
                {[...Array(36)].map((_, i) => {
                  const angle = i * 10;
                  const isMajor = angle % 30 === 0;
                  const isCardinal = angle % 90 === 0;
                  const tickLength = isCardinal ? 14 : isMajor ? 10 : 4;
                  const innerR = outerRadius - tickLength;
                  const outerR = outerRadius;
                  const rad = ((angle - 90) * Math.PI) / 180;

                  return (
                    <line
                      key={i}
                      x1={center + innerR * Math.cos(rad)}
                      y1={center + innerR * Math.sin(rad)}
                      x2={center + outerR * Math.cos(rad)}
                      y2={center + outerR * Math.sin(rad)}
                      stroke={isCardinal ? '#94a3b8' : isMajor ? '#64748b' : '#475569'}
                      strokeWidth={isCardinal ? 2 : 1}
                    />
                  );
                })}

                {/* North indicator - red triangle */}
                <polygon
                  points={`${center},${center - outerRadius - 8} ${center - 6},${center - outerRadius - 20} ${center + 6},${center - outerRadius - 20}`}
                  fill="#f87171"
                />

                {/* Wind arrow - rendered BEFORE runway */}
                {windRotation !== null && metar?.wspd && metar.wspd > 0 && (
                  <g transform={`rotate(${windRotation}, ${center}, ${center})`}>
                    {/* Wind line */}
                    <line
                      x1={center}
                      y1={center - outerRadius + 8}
                      x2={center}
                      y2={center + outerRadius - 8}
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Arrow head pointing INTO the wind (from direction) */}
                    <polygon
                      points={`${center},${center - outerRadius + 6} ${center - 8},${center - outerRadius + 22} ${center + 8},${center - outerRadius + 22}`}
                      fill="#38bdf8"
                    />
                  </g>
                )}

                {/* Runway */}
                {bestRunway && (
                  <g transform={`rotate(${runwayRotation}, ${center}, ${center})`}>
                    {/* Runway rectangle */}
                    <rect
                      x={center - runwayWidth / 2}
                      y={center - runwayLength / 2}
                      width={runwayWidth}
                      height={runwayLength}
                      fill="#1e293b"
                      stroke="#64748b"
                      strokeWidth="2"
                      rx="2"
                    />

                    {/* Center line dashes */}
                    {[...Array(7)].map((_, i) => (
                      <rect
                        key={`cl-${i}`}
                        x={center - 1.5}
                        y={center - runwayLength * 0.38 + i * 18}
                        width="3"
                        height="10"
                        fill="#f8fafc"
                      />
                    ))}

                    {/* Threshold markings - top */}
                    {[...Array(4)].map((_, i) => (
                      <rect
                        key={`top-${i}`}
                        x={center - runwayWidth / 2 + 4 + i * ((runwayWidth - 8) / 4)}
                        y={center - runwayLength / 2 + 10}
                        width="3"
                        height="14"
                        fill="#f8fafc"
                      />
                    ))}

                    {/* Threshold markings - bottom */}
                    {[...Array(4)].map((_, i) => (
                      <rect
                        key={`bot-${i}`}
                        x={center - runwayWidth / 2 + 4 + i * ((runwayWidth - 8) / 4)}
                        y={center + runwayLength / 2 - 24}
                        width="3"
                        height="14"
                        fill="#f8fafc"
                      />
                    ))}
                  </g>
                )}
              </svg>
            </div>

            {/* Right side - Info Cards Grid */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingLeft: '32px',
              }}
            >
              {/* 2x3 Grid of cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Row 1 */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Wind Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Wind</div>
                    <div style={{ display: 'flex', fontSize: '22px', color: 'white', fontWeight: '600' }}>{windStr}</div>
                  </div>

                  {/* Visibility Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Visibility</div>
                    <div style={{ display: 'flex', fontSize: '22px', color: 'white', fontWeight: '600' }}>{visibilityStr || 'N/A'}</div>
                  </div>
                </div>

                {/* Row 2 */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* QNH Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>QNH</div>
                    <div style={{ display: 'flex', fontSize: '22px', color: 'white', fontWeight: '600' }}>
                      {metar?.altim ? `${metar.altim} hPa` : 'N/A'}
                    </div>
                  </div>

                  {/* Temperature Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Temp / Dewpoint</div>
                    <div style={{ display: 'flex', fontSize: '22px', color: 'white', fontWeight: '600' }}>
                      {metar?.temp != null ? `${metar.temp}°C` : 'N/A'}
                      {metar?.dewp != null && <span style={{ color: '#64748b', marginLeft: '6px' }}>/ {metar.dewp}°C</span>}
                    </div>
                  </div>
                </div>

                {/* Row 3 */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Density Altitude Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: daWarning ? 'rgba(251, 191, 36, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    flex: 1,
                    border: daWarning ? '1px solid rgba(251, 191, 36, 0.4)' : 'none',
                  }}>
                    <div style={{ display: 'flex', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Density Alt</div>
                    <div style={{ display: 'flex', fontSize: '22px', color: daWarning ? '#fbbf24' : 'white', fontWeight: '600' }}>
                      {densityAltitude != null ? `${densityAltitude.toLocaleString()} ft` : 'N/A'}
                    </div>
                  </div>

                  {/* Sun Status Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                      {daylightPhase === 'night' ? 'Night' : daylightPhase === 'civil-twilight' ? 'Twilight' : 'Day'}
                    </div>
                    <div style={{
                      display: 'flex',
                      fontSize: '22px',
                      color: vfrLegal ? '#4ade80' : '#f87171',
                      fontWeight: '600'
                    }}>
                      {vfrLegal ? 'VFR OK' : 'Night ops'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <div style={{ display: 'flex', fontSize: '16px', color: '#475569' }}>
              joseflys.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('OG Image generation error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
