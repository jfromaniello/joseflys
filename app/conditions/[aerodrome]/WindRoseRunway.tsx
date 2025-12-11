import { SelectedRunway } from "@/lib/runwayUtils";

interface WindRoseRunwayProps {
  windDir: number | null;
  windSpeed: number | null;
  runway: SelectedRunway;
  size?: number;
}

export function WindRoseRunway({
  windDir,
  windSpeed,
  runway,
  size = 200,
}: WindRoseRunwayProps) {
  const center = size / 2;
  const compassRadius = size * 0.40;
  const runwayLength = size * 0.58;
  const runwayWidth = size * 0.14;

  // Scale factor for internal elements (relative to base size of 200)
  const scale = size / 200;

  // Runway heading (true)
  const runwayRotation = runway.heading;

  // Opposite runway number
  const oppositeEnd = ((parseInt(runway.endId) + 18 - 1) % 36 + 1).toString().padStart(2, "0");

  // Wind arrow rotation
  const windRotation = windDir !== null ? windDir : null;

  // Scaled dimensions for runway markings
  const thresholdBarWidth = 3 * scale;
  const thresholdBarHeight = 10 * scale;
  const thresholdBarGap = (runwayWidth - 4 * scale) / 4; // Distribute bars across runway width
  const thresholdOffset = 18 * scale; // Distance from runway end to threshold bars
  const numberOffset = 9 * scale; // Distance from runway end to number

  const centerLineWidth = 2 * scale;
  const centerLineHeight = 10 * scale;
  const centerLineGap = 16 * scale;
  const centerLineStart = runwayLength * 0.28; // Start after threshold area

  // Calculate number of center line dashes that fit
  const availableSpace = runwayLength - 2 * centerLineStart;
  const numCenterLines = Math.max(1, Math.floor(availableSpace / centerLineGap));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={compassRadius}
        fill="rgba(15, 23, 42, 0.5)"
        stroke="rgba(71, 85, 105, 0.4)"
        strokeWidth="1"
      />

      {/* Compass tick marks */}
      {[...Array(36)].map((_, i) => {
        const angle = i * 10;
        const isMajor = angle % 30 === 0;
        const isCardinal = angle % 90 === 0;
        const tickLength = isCardinal ? 10 * scale : isMajor ? 7 * scale : 3 * scale;
        const innerR = compassRadius - tickLength;
        const outerR = compassRadius;
        const rad = ((angle - 90) * Math.PI) / 180;

        return (
          <line
            key={i}
            x1={center + innerR * Math.cos(rad)}
            y1={center + innerR * Math.sin(rad)}
            x2={center + outerR * Math.cos(rad)}
            y2={center + outerR * Math.sin(rad)}
            stroke={isCardinal ? "#94a3b8" : "#475569"}
            strokeWidth={isCardinal ? 1.5 : 0.75}
          />
        );
      })}

      {/* Heading numbers every 30° */}
      {[...Array(12)].map((_, i) => {
        const angle = i * 30;
        const headingNum = angle === 0 ? 36 : angle / 10;
        const rad = ((angle - 90) * Math.PI) / 180;
        const labelR = compassRadius + 12 * scale;
        const isNorth = angle === 0;

        return (
          <text
            key={i}
            x={center + labelR * Math.cos(rad)}
            y={center + labelR * Math.sin(rad)}
            fill={isNorth ? "#f87171" : "#64748b"}
            fontSize={10 * scale}
            fontWeight={isNorth ? "bold" : "normal"}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {isNorth ? "N" : headingNum.toString().padStart(2, "0")}
          </text>
        );
      })}

      {/* Wind line - rendered BEFORE runway so it appears behind */}
      {windRotation !== null && windSpeed !== null && windSpeed > 0 && (
        <g transform={`rotate(${windRotation}, ${center}, ${center})`}>
          {/* Thin line through the center */}
          <line
            x1={center}
            y1={center - compassRadius + 2 * scale}
            x2={center}
            y2={center + compassRadius - 2 * scale}
            stroke="#f8fafc"
            strokeWidth={1.5 * scale}
            strokeLinecap="round"
          />

          {/* Arrow head at the origin (where wind comes FROM) - pointing inward */}
          <polygon
            points={`
              ${center},${center - compassRadius + 18 * scale}
              ${center - 6 * scale},${center - compassRadius + 6 * scale}
              ${center + 6 * scale},${center - compassRadius + 6 * scale}
            `}
            fill="#f8fafc"
          />
        </g>
      )}

      {/* Runway - rendered AFTER wind line so it appears on top */}
      <g transform={`rotate(${runwayRotation}, ${center}, ${center})`}>
        {/* Runway body */}
        <rect
          x={center - runwayWidth / 2}
          y={center - runwayLength / 2}
          width={runwayWidth}
          height={runwayLength}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1"
          rx={1 * scale}
        />

        {/* Center line dashes - between the two thresholds */}
        {[...Array(numCenterLines)].map((_, i) => (
          <rect
            key={i}
            x={center - centerLineWidth / 2}
            y={center - runwayLength / 2 + centerLineStart + i * centerLineGap}
            width={centerLineWidth}
            height={centerLineHeight}
            fill="#f8fafc"
          />
        ))}

        {/* Top threshold - piano keys style */}
        {[...Array(4)].map((_, i) => (
          <rect
            key={`top-${i}`}
            x={center - runwayWidth / 2 + 2 * scale + i * thresholdBarGap}
            y={center - runwayLength / 2 + thresholdOffset}
            width={thresholdBarWidth}
            height={thresholdBarHeight}
            fill="#f8fafc"
          />
        ))}

        {/* Bottom threshold - piano keys style */}
        {[...Array(4)].map((_, i) => (
          <rect
            key={`bottom-${i}`}
            x={center - runwayWidth / 2 + 2 * scale + i * thresholdBarGap}
            y={center + runwayLength / 2 - thresholdOffset - thresholdBarHeight}
            width={thresholdBarWidth}
            height={thresholdBarHeight}
            fill="#f8fafc"
          />
        ))}

        {/* Opposite runway number (top) - rotated 180° to read when landing from that side */}
        <g transform={`rotate(180, ${center}, ${center - runwayLength / 2 + numberOffset})`}>
          <text
            x={center}
            y={center - runwayLength / 2 + numberOffset}
            fill="#94a3b8"
            fontSize={10 * scale}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {oppositeEnd}
          </text>
        </g>

        {/* Active runway number (bottom) - where you START from, no rotation needed */}
        <text
          x={center}
          y={center + runwayLength / 2 - numberOffset}
          fill="#f8fafc"
          fontSize={10 * scale}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {runway.endId}
        </text>
      </g>

      {/* Wind component indicators */}
      {windSpeed !== null && windSpeed > 0 && (
        <>
          {/* Headwind indicator (bottom left) - arrow pointing down = headwind (coming at you) */}
          <g transform={`translate(${8 * scale}, ${size - 12 * scale})`}>
            <polygon
              points={
                runway.headwind >= 0
                  ? `${4 * scale},${8 * scale} 0,0 ${8 * scale},0`  // Triangle pointing DOWN (headwind)
                  : `${4 * scale},0 0,${8 * scale} ${8 * scale},${8 * scale}`  // Triangle pointing UP (tailwind)
              }
              fill={runway.headwind >= 0 ? "#f8fafc" : "#f87171"}
            />
            <text
              x={14 * scale}
              y={7 * scale}
              fill="#f8fafc"
              fontSize={10 * scale}
              dominantBaseline="middle"
            >
              {Math.abs(runway.headwind)} kt
            </text>
          </g>

          {/* Crosswind indicator (bottom right) */}
          {runway.crosswind > 0 && (
            <g transform={`translate(${size - 50 * scale}, ${size - 12 * scale})`}>
              <polygon
                points={`0,${4 * scale} ${8 * scale},0 ${8 * scale},${8 * scale}`}
                fill="#f8fafc"
                transform={runway.crosswindDirection === "R" ? "" : `rotate(180, ${4 * scale}, ${4 * scale})`}
              />
              <text
                x={14 * scale}
                y={7 * scale}
                fill="#f8fafc"
                fontSize={10 * scale}
                dominantBaseline="middle"
              >
                {runway.crosswind} kt
              </text>
            </g>
          )}
        </>
      )}
    </svg>
  );
}
