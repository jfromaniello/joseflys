import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { calculateTimeSpeedDistance, calculateFuelConsumption, formatTime } from '@/lib/flightPlanningCalculations';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get parameters from URL
    const mode = (searchParams.get('mode') || 'time-speed-distance') as 'time-speed-distance' | 'fuel';

    if (mode === 'time-speed-distance') {
      const gs = searchParams.get('gs') || '';
      const dist = searchParams.get('dist') || '';
      const th = searchParams.get('th') || '';
      const tm = searchParams.get('tm') || '';

      const totalTimeMinutes = (parseFloat(th) || 0) * 60 + (parseFloat(tm) || 0);
      const result = calculateTimeSpeedDistance(
        gs ? parseFloat(gs) : undefined,
        dist ? parseFloat(dist) : undefined,
        totalTimeMinutes > 0 ? totalTimeMinutes : undefined
      );

      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'rgba(30, 58, 138, 0.5)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(56, 189, 248)"
                  strokeWidth="2"
                >
                  <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '56px',
                    fontWeight: 'bold',
                    color: 'white',
                  }}
                >
                  Flight Planning
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '26px',
                    color: 'rgba(148, 163, 184, 1)',
                  }}
                >
                  Time / Speed / Distance
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '1100px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '16px',
                  padding: '25px 40px',
                  minWidth: '230px',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                  {result.groundSpeed?.toFixed(1) || '—'}
                </div>
                <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>
                  Ground Speed (KT)
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '16px',
                  padding: '25px 40px',
                  minWidth: '230px',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                  {result.distance?.toFixed(1) || '—'}
                </div>
                <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>
                  Distance (NM)
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '16px',
                  padding: '25px 40px',
                  minWidth: '230px',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                  {result.time ? formatTime(result.time) : '—'}
                </div>
                <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>
                  Time
                </div>
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    } else {
      // Fuel mode
      const ff = searchParams.get('ff') || '';
      const fu = searchParams.get('fu') || '';
      const fth = searchParams.get('fth') || '';
      const ftm = searchParams.get('ftm') || '';
      const fa = searchParams.get('fa') || '';

      const fuelTotalTimeMinutes = (parseFloat(fth) || 0) * 60 + (parseFloat(ftm) || 0);
      const result = calculateFuelConsumption(
        ff ? parseFloat(ff) : undefined,
        fu ? parseFloat(fu) : undefined,
        fuelTotalTimeMinutes > 0 ? fuelTotalTimeMinutes : undefined,
        fa ? parseFloat(fa) : undefined
      );

      const displayResults = [];
      if (result.fuelFlow) displayResults.push({ label: 'Fuel Flow', value: `${result.fuelFlow.toFixed(1)} /HR` });
      if (result.fuelUsed) displayResults.push({ label: 'Fuel Used', value: `${result.fuelUsed.toFixed(1)} GAL/LBS` });
      if (result.time) displayResults.push({ label: 'Time', value: formatTime(result.time) });
      if (result.endurance) displayResults.push({ label: 'Endurance', value: formatTime(result.endurance) });

      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'rgba(30, 58, 138, 0.5)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(56, 189, 248)"
                  strokeWidth="2"
                >
                  <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '56px',
                    fontWeight: 'bold',
                    color: 'white',
                  }}
                >
                  Flight Planning
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '26px',
                    color: 'rgba(148, 163, 184, 1)',
                  }}
                >
                  Fuel Consumption
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '1100px',
              }}
            >
              {displayResults.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    border: '2px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '16px',
                    padding: '25px 40px',
                    minWidth: '230px',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                    {item.value}
                  </div>
                  <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
  } catch (e) {
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
