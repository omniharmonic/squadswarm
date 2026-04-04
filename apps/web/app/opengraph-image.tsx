import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SquadSwarm — Squads bid. Swarms deliver.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#FAFAF8',
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
          color: '#1A1A1A',
          marginBottom: 16,
        }}>
          SquadSwarm
        </div>
        <div style={{
          fontSize: 32,
          color: '#bb6b44',
          fontWeight: 500,
        }}>
          Squads bid. Swarms deliver.
        </div>
        <div style={{
          fontSize: 20,
          color: '#64635F',
          marginTop: 24,
        }}>
          Cooperative work brokerage with AI-native project management
        </div>
      </div>
    ),
    { ...size },
  );
}
