import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompararSection from "@/components/CompararSection";

describe("CompararSection", () => {
  it("se titula Biblioteca fitoquímica", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", { level: 2, name: /biblioteca fitoquímica/i }),
    ).toBeInTheDocument();
  });

  it("incluye la biblioteca de compuestos y la evidencia antimicrobiana", () => {
    render(<CompararSection />);
    expect(screen.getAllByText("Polifenoles").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /evidencia sobre actividad antimicrobiana/i,
      }),
    ).toBeInTheDocument();
  });
});
