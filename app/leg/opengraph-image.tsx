import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

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
          background: 'linear-gradient(to bottom right, #0f172a 0%, #172554 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: '80px',
        }}
      >
        {/* Icon + Domain */}
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
              background: '#1e293b',
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
              stroke="#93b4f0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '600',
              color: '#94a3b8',
            }}
          >
            joseflys.com
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '30px',
            textAlign: 'center',
          }}
        >
          Flight Planning
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '36px',
            color: '#94a3b8',
            textAlign: 'center',
          }}
        >
          José&apos;s Aviation Tools
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
