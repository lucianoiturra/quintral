"use client";
import BibliotecaFito from "@/components/BibliotecaFito";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";

export default function CompararSection() {
  return (
    <section id="comparar" className="section">
      <div className="section-head">
        <p className="kicker" data-num="04">
          Análisis fitoquímico
        </p>
        <h2>Biblioteca fitoquímica</h2>
        <p>
          Los compuestos detectados en el quintral y las propiedades biomédicas
          que se investigan. La tabla resume el panorama y cada ficha guarda el
          detalle. En 2026 sumamos evidencia experimental sobre su actividad
          antimicrobiana.
        </p>
      </div>

      <BibliotecaFito />
      <EvidenciaAntimicrobiana />
    </section>
  );
}
