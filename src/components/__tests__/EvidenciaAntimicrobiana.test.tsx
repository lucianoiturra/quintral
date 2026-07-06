import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvidenciaAntimicrobiana from "@/components/EvidenciaAntimicrobiana";

describe("EvidenciaAntimicrobiana", () => {
  it("muestra las 3 bacterias y el resultado sin inhibición", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(screen.getByText(/Escherichia coli ATCC 25922/)).toBeInTheDocument();
    expect(screen.getByText(/Staphylococcus aureus ATCC 25923/)).toBeInTheDocument();
    expect(screen.getByText(/Enterococcus faecalis ATCC 29212/)).toBeInTheDocument();
    expect(screen.getAllByText(/sin inhibición/i).length).toBe(3);
  });

  it("presenta las líneas futuras y el aprendizaje", () => {
    render(<EvidenciaAntimicrobiana />);
    expect(
      screen.getByRole("heading", { name: /qué aprendimos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no mostraron actividad antimicrobiana/i)).toBeInTheDocument();
  });
});
