import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { calculateWinds } from '@/lib/windCalculations';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get parameters from URL
    const wd = searchParams.get('wd') || '270';
    const ws = searchParams.get('ws') || '20';
    const th = searchParams.get('th') || '360';
    const tas = searchParams.get('tas') || '100';
    const md = searchParams.get('md') || '0';
    const dist = searchParams.get('dist');
    const ff = searchParams.get('ff');

    // Calculate wind corrections
    const windDir = parseFloat(wd);
    const windSpeed = parseFloat(ws);
    const trueHeading = parseFloat(th);
    const tasVal = parseFloat(tas);
    const magDev = parseFloat(md);
    const distance = dist ? parseFloat(dist) : undefined;
    const fuelFlow = ff ? parseFloat(ff) : undefined;

    const results = calculateWinds(windDir, windSpeed, trueHeading, tasVal, magDev, distance, fuelFlow);

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
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '60px',
                  fontWeight: 'bold',
                  color: 'white',
                }}
              >
                Wind Calculator
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: 'rgba(148, 163, 184, 1)',
                }}
              >
                José's Aviation Tools
              </div>
            </div>
          </div>

          {/* Results - Only show the calculated values */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Primary Results Row */}
            <div style={{ display: 'flex', gap: '30px' }}>
              {/* Ground Speed */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '20px',
                  padding: '30px 40px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '18px', color: 'rgb(56, 189, 248)', marginBottom: '10px', letterSpacing: '1px' }}>
                  GROUND SPEED
                </div>
                <div style={{ display: 'flex', fontSize: '56px', fontWeight: 'bold', color: 'white' }}>
                  {results.groundSpeed.toFixed(1)} kt
                </div>
              </div>

              {/* Compass Heading */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '2px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '20px',
                  padding: '30px 40px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '18px', color: 'rgb(56, 189, 248)', marginBottom: '10px', letterSpacing: '1px' }}>
                  COMPASS HDG
                </div>
                <div style={{ display: 'flex', fontSize: '56px', fontWeight: 'bold', color: 'white' }}>
                  {results.compassHeading.toFixed(1)}°
                </div>
              </div>

              {/* WCA */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '2px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '20px',
                  padding: '30px 40px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '18px', color: 'rgba(148, 163, 184, 1)', marginBottom: '10px' }}>
                  WCA
                </div>
                <div style={{ display: 'flex', fontSize: '56px', fontWeight: 'bold', color: 'white' }}>
                  {results.windCorrectionAngle >= 0 ? '+' : ''}{results.windCorrectionAngle.toFixed(1)}°
                </div>
              </div>
            </div>

            {/* ETA and Fuel Row - Only show if calculated */}
            {(results.eta !== undefined || results.fuelUsed !== undefined) && (
              <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                {/* ETA */}
                {results.eta !== undefined && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                      border: '2px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px',
                      padding: '25px 50px',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: '16px', color: 'rgb(16, 185, 129)', marginBottom: '8px', letterSpacing: '1px' }}>
                      ETA
                    </div>
                    <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                      {Math.floor(results.eta)}:{String(Math.round((results.eta % 1) * 60)).padStart(2, '0')}
                    </div>
                  </div>
                )}

                {/* Fuel Used */}
                {results.fuelUsed !== undefined && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                      border: '2px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px',
                      padding: '25px 50px',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: '16px', color: 'rgb(16, 185, 129)', marginBottom: '8px', letterSpacing: '1px' }}>
                      FUEL USED
                    </div>
                    <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                      {results.fuelUsed.toFixed(1)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
