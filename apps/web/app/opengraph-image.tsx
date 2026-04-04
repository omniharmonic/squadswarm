import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SquadSwarm — Squads bid. Swarms deliver.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#FAF8F5',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui',
      }}>
        <div style={{
          fontSize: 72,
          fontWeight: 700,
          color: '#2C2825',
          marginBottom: 16,
        }}>
          SquadSwarm
        </div>
        <div style={{
          fontSize: 32,
          color: '#C4553A',
          fontWeight: 500,
        }}>
          Squads bid. Swarms deliver.
        </div>
        <div style={{
          fontSize: 20,
          color: '#6B6560',
          marginTop: 24,
        }}>
          Cooperative work brokerage with AI-native project management
        </div>
      </div>
    ),
    { ...size },
  );
}
