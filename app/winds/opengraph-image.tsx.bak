import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = "José's Wind Calculator"
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  // Get URL search params - we'll need to handle this differently in Edge runtime
  // For now, use default values - the OG image will update when shared with params

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

        {/* Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '2px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '20px',
            padding: '40px 60px',
            marginBottom: '30px',
          }}
        >
          <div style={{ fontSize: '32px', color: 'white', marginBottom: '20px' }}>
            Calculate wind corrections for accurate flight planning
          </div>
          <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgb(56, 189, 248)', marginBottom: '8px' }}>
                Wind Correction Angle
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)' }}>
                Heading adjustment
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgb(56, 189, 248)', marginBottom: '8px' }}>
                Ground Speed
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)' }}>
                Actual speed over ground
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgb(56, 189, 248)', marginBottom: '8px' }}>
                Compass Heading
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)' }}>
                Magnetic heading to fly
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            display: 'flex',
            fontSize: '20px',
            color: 'rgba(148, 163, 184, 1)',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Includes ETAS calculation for large wind correction angles
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
