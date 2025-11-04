import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = "José's TAS Calculator"
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  // Get URL search params
  const searchParams = new URL(
    typeof window !== 'undefined' ? window.location.href : 'http://localhost'
  ).searchParams

  const cas = searchParams.get('cas') || '90'
  const oat = searchParams.get('oat') || '8'
  const alt = searchParams.get('alt') || '4000'

  // Calculate TAS
  function calculateTAS(casKt: number, oatC: number, hFt: number): number {
    const T0 = 288.15
    const P0 = 101325.0
    const g0 = 9.80665
    const R = 287.05287
    const L = 0.0065
    const hM = hFt * 0.3048
    const tAct = oatC + 273.15
    const exp = g0 / (R * L)
    const pIsa = P0 * Math.pow(1 - (L * hM) / T0, exp)
    const rho0 = P0 / (R * T0)
    const rho = pIsa / (R * tAct)
    return casKt * Math.sqrt(rho0 / rho)
  }

  const tas = calculateTAS(parseFloat(cas), parseFloat(oat), parseFloat(alt))

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

        {/* Parameters Card */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '2px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '30px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', gap: '60px' }}>
            {/* CAS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgba(148, 163, 184, 1)', marginBottom: '10px' }}>
                CAS
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                {cas}
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)' }}>
                knots
              </div>
            </div>

            {/* OAT */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgba(148, 163, 184, 1)', marginBottom: '10px' }}>
                OAT
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                {oat}
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)' }}>
                °C
              </div>
            </div>

            {/* Altitude */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgba(148, 163, 184, 1)', marginBottom: '10px' }}>
                Altitude
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>
                {alt}
              </div>
              <div style={{ fontSize: '18px', color: 'rgba(148, 163, 184, 1)' }}>
                feet
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '20px',
            padding: '30px 80px',
          }}
        >
          <div style={{ fontSize: '24px', color: 'rgb(56, 189, 248)', marginBottom: '10px', letterSpacing: '2px' }}>
            TRUE AIRSPEED
          </div>
          <div style={{ fontSize: '80px', fontWeight: 'bold', color: 'white' }}>
            {tas.toFixed(1)} kt
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
