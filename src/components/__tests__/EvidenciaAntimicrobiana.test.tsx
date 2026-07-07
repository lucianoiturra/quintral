import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";

describe("EvidenciaAntimicrobiana", () => {
  it("muestra el veredicto sin inhibición y las 3 bacterias", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(screen.getByText(/sin inhibición del crecimiento/i)).toBeInTheDocument();
    // Scope bacteria queries to the verdict list to avoid ambiguity with NOTA_LITERATURA
    const veredicto = screen.getByRole("heading", { name: /sin inhibición del crecimiento/i }).closest(".ensayo-veredicto");
    expect(veredicto).toBeInTheDocument();
    expect(veredicto?.textContent).toMatch(/Escherichia coli/);
    expect(veredicto?.textContent).toMatch(/Staphylococcus aureus/);
    expect(veredicto?.textContent).toMatch(/Enterococcus faecalis/);
  });

  it("presenta la narrativa, el aprendizaje y pliega el detalle técnico", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(screen.getByRole("heading", { name: /la pregunta/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /qué significa/i })).toBeInTheDocument();
    expect(screen.getByText(/no mostraron actividad antimicrobiana/i)).toBeInTheDocument();
    // el detalle técnico (concentraciones/controles) está dentro de un <details>
    expect(screen.getByText(/ver detalles del ensayo/i)).toBeInTheDocument();
  });
});
