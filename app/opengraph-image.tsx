import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = "José's Aviation Calculators"
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
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
        {/* Icon */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '30px',
            background: 'rgba(30, 58, 138, 0.5)',
            border: '3px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(56, 189, 248)"
            strokeWidth="2"
          >
            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
          }}
        >
          José's Aviation Calculators
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '36px',
            color: 'rgba(148, 163, 184, 1)',
            marginBottom: '50px',
          }}
        >
          Professional flight planning tools
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
          }}
        >
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
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
              TAS Calculator
            </div>
            <div style={{ fontSize: '20px', color: 'rgba(148, 163, 184, 1)', textAlign: 'center' }}>
              True Airspeed from<br />CAS, OAT & Altitude
            </div>
          </div>

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
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
              Wind Calculator
            </div>
            <div style={{ fontSize: '20px', color: 'rgba(148, 163, 184, 1)', textAlign: 'center' }}>
              Wind Correction, Ground Speed<br />& Compass Heading
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
