export interface RadarSerie {
  nombre: string;
  color: string;
  valores: (number | null)[]; // 0..1, mismo orden que ejes
}

export interface RadarChartProps {
  ejes: string[];
  series: RadarSerie[];
  size?: number;
}

export default function RadarChart({ ejes, series, size = 320 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 52; // margen para etiquetas
  const n = ejes.length;
  const angulo = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const punto = (i: number, frac: number): [number, number] => {
    const a = angulo(i);
    return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac];
  };
  const anillos = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="radar"
      role="img"
      aria-label={`Gráfico de radar comparando ${series
        .map((s) => s.nombre)
        .join(" y ")} en ${ejes.join(", ")}`}
    >
      {anillos.map((frac) => (
        <polygon
          key={frac}
          className="radar-grid"
          points={ejes.map((_, i) => punto(i, frac).join(",")).join(" ")}
        />
      ))}

      {ejes.map((eje, i) => {
        const [x, y] = punto(i, 1);
        const [lx, ly] = punto(i, 1.16);
        return (
          <g key={eje}>
            <line x1={cx} y1={cy} x2={x} y2={y} className="radar-axis" />
            <text
              x={lx}
              y={ly}
              className="radar-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {eje}
            </text>
          </g>
        );
      })}

      {series.map((s) => (
        <polygon
          key={s.nombre}
          className="radar-serie"
          points={s.valores.map((v, i) => punto(i, v ?? 0).join(",")).join(" ")}
          fill={s.color}
          fillOpacity={0.18}
          stroke={s.color}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
