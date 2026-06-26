export interface Barra {
  etiqueta: string;
  valor: number | null;
  unidad: string;
  color: string;
}

export interface BarChartProps {
  barras: Barra[];
  maxY?: number;
  size?: { w: number; h: number };
}

export default function BarChart({
  barras,
  maxY,
  size = { w: 460, h: 300 },
}: BarChartProps) {
  const { w, h } = size;
  const padL = 46;
  const padR = 16;
  const padT = 26;
  const padB = 50;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const tope = maxY ?? Math.max(60, ...barras.map((b) => b.valor ?? 0));
  const bw = plotW / barras.length;
  const yDe = (v: number) => padT + plotH * (1 - v / tope);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * tope));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="bar-chart"
      role="img"
      aria-label={`Gráfico de barras: ${barras
        .map((b) => `${b.etiqueta} ${b.valor ?? "no determinado"} ${b.unidad}`)
        .join("; ")}`}
    >
      <defs>
        <pattern
          id="nd-hatch"
          width="6"
          height="6"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="6" height="6" fill="var(--line-soft)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-faint)" strokeWidth="1.5" />
        </pattern>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={yDe(t)} x2={w - padR} y2={yDe(t)} className="bar-grid" />
          <text
            x={padL - 8}
            y={yDe(t)}
            className="bar-tick"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {t}
          </text>
        </g>
      ))}

      {barras.map((b, i) => {
        const x = padL + i * bw + bw * 0.18;
        const innerW = bw * 0.64;
        // Chequear `b.valor === null` directamente para que TS estreche a number.
        const y = b.valor === null ? padT : yDe(b.valor);
        const bh = b.valor === null ? plotH : plotH * (b.valor / tope);
        return (
          <g key={b.etiqueta}>
            <rect
              x={x}
              y={y}
              width={innerW}
              height={bh}
              rx={6}
              className="bar-rect"
              fill={b.valor === null ? "url(#nd-hatch)" : b.color}
            />
            <text
              x={x + innerW / 2}
              y={b.valor === null ? padT + plotH / 2 : y - 6}
              className="bar-value"
              textAnchor="middle"
            >
              {b.valor === null ? "n/d" : `${b.valor} ${b.unidad}`}
            </text>
            <text
              x={x + innerW / 2}
              y={h - padB + 18}
              className="bar-cat"
              textAnchor="middle"
            >
              {b.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
