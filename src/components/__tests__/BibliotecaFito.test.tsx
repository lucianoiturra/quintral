import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BibliotecaFito from "@/components/BibliotecaFito";

describe("BibliotecaFito", () => {
  it("muestra los 6 compuestos y su presencia en el quintral", () => {
    render(<BibliotecaFito />);
    expect(screen.getByText("Polifenoles")).toBeInTheDocument();
    expect(screen.getByText("Glicósidos")).toBeInTheDocument();
    // el botón/resumen de presencia aparece una vez por ficha
    expect(
      screen.getAllByText(/¿está presente en el quintral\?/i).length,
    ).toBe(6);
  });

  it("incluye enlaces a los estudios científicos", () => {
    render(<BibliotecaFito />);
    const enlaces = screen.getAllByRole("link", { name: /ver estudio|scielo|Torres|Simirgiotis/i });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
