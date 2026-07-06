"use client";
import { FAQ } from "@/lib/faq";

export default function FaqSection() {
  return (
    <section id="preguntas" className="section">
      <div className="section-head">
        <p className="kicker" data-num="05">
          Asistente científico
        </p>
        <h2>Preguntas frecuentes sobre el quintral</h2>
        <p>
          Respuestas breves y verificadas sobre la biología, ecología y usos del
          quintral. Disponibles sin conexión para consultarlas en terreno.
        </p>
      </div>

      <ul className="faq-list">
        {FAQ.map((item) => (
          <li key={item.pregunta} className="card faq-item">
            <details>
              <summary>{item.pregunta}</summary>
              <p>{item.respuesta}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
