import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompararSection from "@/components/CompararSection";

describe("CompararSection", () => {
  it("muestra el título, la tabla con datos reales y antocianinas n/d", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", {
        name: /perfil fitoquímico del quintral/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/S-218-25/)).toBeInTheDocument();
    expect(screen.getAllByText("n/d").length).toBeGreaterThan(0);
  });

  it("incluye la biblioteca fitoquímica y la evidencia antimicrobiana", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", { name: /biblioteca fitoquímica/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /evidencia sobre actividad antimicrobiana/i }),
    ).toBeInTheDocument();
  });
});
