interface RadarAttribute {
  key: string;
  value: number; // 0–99
}

interface HexRadarChartProps {
  attributes: RadarAttribute[];
  communityAttributes?: RadarAttribute[];
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function buildPolygonPoints(cx: number, cy: number, r: number, n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (360 / n) * i;
    return polarToCartesian(cx, cy, r, angle);
  });
}

function pointsToPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

export function HexRadarChart({ attributes, communityAttributes, size = 240 }: HexRadarChartProps) {
  const n = attributes.length; // should be 6
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const labelR = size * 0.49;

  // Background rings (3 levels)
  const rings = [0.33, 0.66, 1];

  // Data polygon
  const dataPoints = attributes.map((attr, i) => {
    const angle = (360 / n) * i;
    const r = (attr.value / 99) * maxR;
    return polarToCartesian(cx, cy, r, angle);
  });

  // Community polygon
  let communityPoints: { x: number; y: number }[] = [];
  if (communityAttributes && communityAttributes.length === n) {
    communityPoints = communityAttributes.map((attr, i) => {
      const angle = (360 / n) * i;
      const r = (attr.value / 99) * maxR;
      return polarToCartesian(cx, cy, r, angle);
    });
  }

  // Axis endpoint points (for lines from center)
  const axisPoints = attributes.map((_, i) => {
    const angle = (360 / n) * i;
    return polarToCartesian(cx, cy, maxR, angle);
  });

  // Label positions
  const labelPoints = attributes.map((_, i) => {
    const angle = (360 / n) * i;
    return polarToCartesian(cx, cy, labelR, angle);
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-label="Radar chart de atributos do atleta"
      className="overflow-visible"
    >
      {/* Background rings */}
      {rings.map((scale, ri) => {
        const pts = buildPolygonPoints(cx, cy, maxR * scale, n);
        return (
          <polygon
            key={ri}
            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map((pt, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={pt.x} y2={pt.y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* Community fill polygon */}
      {communityPoints.length > 0 && (
        <path
          d={pointsToPath(communityPoints)}
          fill="rgba(255, 255, 255, 0.04)"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          strokeLinejoin="round"
        />
      )}

      {/* Data fill polygon */}
      <path
        d={pointsToPath(dataPoints)}
        fill="rgba(29, 112, 245, 0.18)"
        stroke="#1d70f5"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {dataPoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={3.5}
          fill="#1d70f5"
          stroke="white"
          strokeWidth={1.5}
        />
      ))}

      {/* Attribute labels */}
      {attributes.map((attr, i) => {
        const lp = labelPoints[i];
        const angle = (360 / n) * i;
        // Align text based on angle position
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (angle > 30 && angle < 150) anchor = 'start';
        else if (angle > 210 && angle < 330) anchor = 'end';

        return (
          <g key={i}>
            <text
              x={lp.x}
              y={lp.y}
              textAnchor={anchor}
              dominantBaseline="central"
              fill="#94a3b8"
              fontSize={10.5}
              fontWeight="700"
              fontFamily="sans-serif"
              letterSpacing="0.5"
            >
              {attr.key}
            </text>
          </g>
        );
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="rgba(29,112,245,0.6)" />
    </svg>
  );
}
