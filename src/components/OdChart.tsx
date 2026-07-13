"use client";
import { useState } from "react";

export interface SerieOD {
  nombre: string;
  color: string;
  valores: number[]; // uno por categoría
  signif?: (string | null)[]; // marca sobre la barra: ns, *, **, ***
}

export interface OdChartProps {
  categorias: string[];
  series: SerieOD[];
  maxY: number;
  size?: { w: number; h: number };
}

export default function OdChart({
  categorias,
  series,
  maxY,
  size = { w: 520, h: 320 },
}: OdChartProps) {
  const { w, h } = size;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 44;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const [hover, setHover] = useState<{ cat: number; serie: number } | null>(null);

  const grupoW = plotW / categorias.length;
  const barW = (grupoW * 0.7) / series.length;
  const yDe = (v: number) => padT + plotH * (1 - v / maxY);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => +(f * maxY).toFixed(2));

  const resumen = series
    .map(
      (s) =>
        `${s.nombre}: ${s.valores
          .map((v, i) => `${categorias[i]} ${v}`)
          .join(", ")}`,
    )
    .join(". ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="od-chart"
      role="img"
      aria-label={`Gráfico OD 600 nm. ${resumen}`}
    >
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

      {categorias.map((cat, ci) => {
        const gx = padL + ci * grupoW;
        return (
          <g key={cat}>
            {series.map((s, si) => {
              const v = s.valores[ci];
              const x = gx + grupoW * 0.15 + si * barW;
              const y = yDe(v);
              const bh = plotH * (v / maxY);
              const activo = hover?.cat === ci && hover?.serie === si;
              const marca = s.signif?.[ci];
              return (
                <g key={s.nombre}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={bh}
                    rx={3}
                    fill={s.color}
                    className="od-bar"
                    opacity={hover && !activo ? 0.45 : 1}
                    onMouseEnter={() => setHover({ cat: ci, serie: si })}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>
                      {`${s.nombre} · ${cat}: ${v} OD${marca ? ` (${marca})` : ""}`}
                    </title>
                  </rect>
                  {marca && (
                    <text
                      x={x + barW / 2}
                      y={Math.max(y - 4, padT + 8)}
                      className="od-signif"
                      textAnchor="middle"
                    >
                      {marca}
                    </text>
                  )}
                </g>
              );
            })}
            <text
              x={gx + grupoW / 2}
              y={h - padB + 16}
              className="bar-cat"
              textAnchor="middle"
            >
              {cat}
            </text>
          </g>
        );
      })}

      {hover &&
        (() => {
          const s = series[hover.serie];
          const v = s.valores[hover.cat];
          const cx = padL + hover.cat * grupoW + grupoW / 2;
          const ty = Math.max(yDe(v) - 10, padT + 10);
          return (
            <text x={cx} y={ty} className="od-tip" textAnchor="middle">
              {`${s.nombre}: ${v}`}
            </text>
          );
        })()}
    </svg>
  );
}
