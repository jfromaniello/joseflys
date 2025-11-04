import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { calculateTAS } from '@/lib/tasCalculations';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get parameters from URL
    const cas = searchParams.get('cas') || '90';
    const oat = searchParams.get('oat') || '8';
    const alt = searchParams.get('alt') || '4000';

    // Calculate TAS
    const casVal = parseFloat(cas);
    const oatVal = parseFloat(oat);
    const altVal = parseFloat(alt);

    const tas = calculateTAS(casVal, oatVal, altVal);

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
              marginBottom: '50px',
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
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
                TAS Calculator
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

          {/* Result Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '2px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '20px',
              padding: '50px 100px',
            }}
          >
            <div style={{ display: 'flex', fontSize: '24px', color: 'rgb(56, 189, 248)', marginBottom: '15px', letterSpacing: '2px' }}>
              TRUE AIRSPEED
            </div>
            <div style={{ display: 'flex', fontSize: '90px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
              {tas.toFixed(1)} kt
            </div>
            <div
              style={{
                display: 'flex',
                gap: '40px',
                marginTop: '20px',
                fontSize: '20px',
                color: 'rgba(148, 163, 184, 1)',
              }}
            >
              <div style={{ display: 'flex' }}>CAS: {cas} kt</div>
              <div style={{ display: 'flex' }}>OAT: {oat}°C</div>
              <div style={{ display: 'flex' }}>Alt: {alt} ft</div>
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
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
