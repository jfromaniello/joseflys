import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getAllConversions, categories, type Category } from '@/lib/unitConversions';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get parameters from URL
    const category = (searchParams.get('cat') || 'distance') as Category;
    const value = searchParams.get('val') || '100';
    const fromUnit = searchParams.get('from') || 'NM';

    // Calculate conversions
    const numValue = parseFloat(value);
    const results = getAllConversions(numValue, fromUnit, category);

    // Get up to 4 conversion results to display
    const displayResults = results.slice(0, 4);
    const categoryInfo = categories[category];

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
                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
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
                Unit Converter
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '26px',
                  color: 'rgba(148, 163, 184, 1)',
                }}
              >
                {categoryInfo.name} Conversions
              </div>
            </div>
          </div>

          {/* Input Value */}
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              color: 'rgb(56, 189, 248)',
              marginBottom: '30px',
            }}
          >
            {value} {fromUnit}
          </div>

          {/* Conversion Results Grid */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '1100px',
            }}
          >
            {displayResults.map((result, index) => {
              const unitInfo = categoryInfo.units.find(u => u.symbol === result.unit);
              return (
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
                    {result.value.toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(148, 163, 184, 1)' }}>
                    {unitInfo?.name || result.unit}
                  </div>
                </div>
              );
            })}
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
