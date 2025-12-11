import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { fetchMetar, getAerodromeByCode, getRunways } from '@/lib/clients';
import { selectBestRunway } from '@/lib/runwayUtils';
import { getSunTimes, isVfrLegal, getDaylightPhase } from '@/lib/sun';

export const runtime = 'edge';

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

    // Format wind string
    const windStr = metar && metar.wdir !== null && metar.wspd !== null
      ? `${String(metar.wdir).padStart(3, '0')}° / ${metar.wspd} kt${metar.wgst ? ` G${metar.wgst}` : ''}`
      : 'Calm';

    // Flight category color and label
    // If it's night and VFR/MVFR, show as night
    const showNightWarning = isNight && (metar?.fltCat === 'VFR' || metar?.fltCat === 'MVFR');
    const fltCatLabel = showNightWarning ? 'Night' : metar?.fltCat;
    const fltCatColor = showNightWarning ? '#fbbf24' // amber for night
      : metar?.fltCat === 'VFR' ? '#4ade80'
      : metar?.fltCat === 'MVFR' ? '#60a5fa'
      : metar?.fltCat === 'IFR' ? '#f87171'
      : metar?.fltCat === 'LIFR' ? '#c084fc'
      : '#94a3b8';

    // Wind rose dimensions - larger for OG image
    const roseSize = 280;
    const center = roseSize / 2;
    const compassRadius = roseSize * 0.38;
    const runwayLength = roseSize * 0.56;
    const runwayWidth = roseSize * 0.12;
    const runwayRotation = bestRunway?.heading ?? 0;
    const windRotation = metar?.wdir ?? null;

    // Calculate opposite runway number
    const oppositeEnd = bestRunway
      ? ((parseInt(bestRunway.endId) + 18 - 1) % 36 + 1).toString().padStart(2, '0')
      : '';

    // Temperature string
    const tempStr = metar && metar.temp !== null
      ? `${metar.temp}°C${metar.dewp !== null ? ` / ${metar.dewp}°C` : ''}`
      : null;

    // Runway info string
    const runwayStr = bestRunway
      ? `${bestRunway.headwind >= 0 ? '+' : ''}${bestRunway.headwind} HW${bestRunway.crosswind > 0 ? ` · ${bestRunway.crosswind} XW` : ''}`
      : '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            background: 'linear-gradient(to bottom right, #0f172a 0%, #172554 50%, #0f172a 100%)',
            fontFamily: 'system-ui, sans-serif',
            padding: '50px',
          }}
        >
          {/* Left side - Info */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingRight: '40px',
            }}
          >
            {/* Airport code and flight category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', fontSize: '72px', fontWeight: 'bold', color: 'white' }}>
                {code}
              </div>
              {fltCatLabel && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: fltCatColor,
                    padding: '4px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.1)',
                  }}
                >
                  {fltCatLabel}
                </div>
              )}
            </div>

            {/* Airport name */}
            <div style={{ display: 'flex', fontSize: '28px', color: '#94a3b8', marginBottom: '40px' }}>
              {aerodrome?.name || 'Unknown Airport'}
            </div>

            {/* Weather info grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Wind */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', width: '100px' }}>Wind</div>
                <div style={{ display: 'flex', fontSize: '32px', color: 'white', fontWeight: '600' }}>{windStr}</div>
              </div>

              {/* QNH */}
              {metar?.altim && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', width: '100px' }}>QNH</div>
                  <div style={{ display: 'flex', fontSize: '32px', color: 'white', fontWeight: '600' }}>
                    {metar.altim} hPa
                  </div>
                </div>
              )}

              {/* Temperature */}
              {tempStr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', width: '100px' }}>Temp</div>
                  <div style={{ display: 'flex', fontSize: '32px', color: 'white', fontWeight: '600' }}>
                    {tempStr}
                  </div>
                </div>
              )}

              {/* Recommended runway */}
              {bestRunway && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', width: '100px' }}>Runway</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <div style={{ display: 'flex', fontSize: '32px', color: '#4ade80', fontWeight: '600' }}>
                      {bestRunway.endId}
                    </div>
                    <div style={{ display: 'flex', fontSize: '20px', color: '#64748b' }}>
                      {runwayStr}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Domain */}
            <div style={{ display: 'flex', marginTop: 'auto', fontSize: '24px', color: '#475569' }}>
              joseflys.com
            </div>
          </div>

          {/* Right side - Wind Rose */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '400px',
            }}
          >
            <svg width={roseSize * 1.5} height={roseSize * 1.5} viewBox={`0 0 ${roseSize * 1.2} ${roseSize * 1.2}`}>
              {/* Offset everything to center in larger viewBox */}
              <g transform={`translate(${roseSize * 0.1}, ${roseSize * 0.1})`}>
                {/* Background circle */}
                <circle
                  cx={center}
                  cy={center}
                  r={compassRadius}
                  fill="rgba(15, 23, 42, 0.7)"
                  stroke="rgba(71, 85, 105, 0.5)"
                  strokeWidth="1"
                />

                {/* Compass tick marks */}
                {[...Array(36)].map((_, i) => {
                  const angle = i * 10;
                  const isMajor = angle % 30 === 0;
                  const isCardinal = angle % 90 === 0;
                  const tickLength = isCardinal ? 12 : isMajor ? 8 : 3;
                  const innerR = compassRadius - tickLength;
                  const outerR = compassRadius;
                  const rad = ((angle - 90) * Math.PI) / 180;

                  return (
                    <line
                      key={i}
                      x1={center + innerR * Math.cos(rad)}
                      y1={center + innerR * Math.sin(rad)}
                      x2={center + outerR * Math.cos(rad)}
                      y2={center + outerR * Math.sin(rad)}
                      stroke={isCardinal ? '#94a3b8' : '#475569'}
                      strokeWidth={isCardinal ? 2 : 1}
                    />
                  );
                })}

                {/* North indicator - small red diamond */}
                <polygon
                  points={`${center},${center - compassRadius - 6} ${center - 5},${center - compassRadius - 14} ${center},${center - compassRadius - 22} ${center + 5},${center - compassRadius - 14}`}
                  fill="#f87171"
                />

                {/* Wind line - rendered BEFORE runway so it appears behind */}
                {windRotation !== null && metar?.wspd && metar.wspd > 0 && (
                  <g transform={`rotate(${windRotation}, ${center}, ${center})`}>
                    <line
                      x1={center}
                      y1={center - compassRadius + 2}
                      x2={center}
                      y2={center + compassRadius - 2}
                      stroke="#f8fafc"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <polygon
                      points={`${center},${center - compassRadius + 20} ${center - 7},${center - compassRadius + 6} ${center + 7},${center - compassRadius + 6}`}
                      fill="#f8fafc"
                    />
                  </g>
                )}

                {/* Runway */}
                {bestRunway && (
                  <g transform={`rotate(${runwayRotation}, ${center}, ${center})`}>
                    <rect
                      x={center - runwayWidth / 2}
                      y={center - runwayLength / 2}
                      width={runwayWidth}
                      height={runwayLength}
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                      rx="1"
                    />

                    {/* Center line dashes */}
                    {[...Array(5)].map((_, i) => (
                      <rect
                        key={`cl-${i}`}
                        x={center - 1.5}
                        y={center - runwayLength * 0.3 + i * 18}
                        width="3"
                        height="10"
                        fill="#f8fafc"
                      />
                    ))}

                    {/* Top threshold - piano keys */}
                    {[...Array(4)].map((_, i) => (
                      <rect
                        key={`top-${i}`}
                        x={center - runwayWidth / 2 + 3 + i * (runwayWidth - 6) / 4}
                        y={center - runwayLength / 2 + 16}
                        width="3"
                        height="10"
                        fill="#f8fafc"
                      />
                    ))}

                    {/* Bottom threshold - piano keys */}
                    {[...Array(4)].map((_, i) => (
                      <rect
                        key={`bot-${i}`}
                        x={center - runwayWidth / 2 + 3 + i * (runwayWidth - 6) / 4}
                        y={center + runwayLength / 2 - 26}
                        width="3"
                        height="10"
                        fill="#f8fafc"
                      />
                    ))}
                  </g>
                )}
              </g>
            </svg>
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
