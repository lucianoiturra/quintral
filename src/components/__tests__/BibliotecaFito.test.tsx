import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BibliotecaFito from "@/components/BibliotecaFito";

describe("BibliotecaFito", () => {
  it("muestra la matriz-panorama y los 6 compuestos con su resumen", () => {
    render(<BibliotecaFito />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("Polifenoles").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Glicósidos").length).toBeGreaterThan(0);
    expect(screen.getByText(/defensa antioxidante de la planta/i)).toBeInTheDocument();
  });

  it("muestra las aplicaciones como chips y pliega el detalle", () => {
    render(<BibliotecaFito />);
    // el resumen "¿Qué es?" completo vive dentro de un <details> plegado
    expect(screen.getAllByText(/ver función y estudios/i).length).toBe(6);
  });

  it("incluye enlaces a los estudios científicos", () => {
    render(<BibliotecaFito />);
    const enlaces = screen.getAllByRole("link", {
      name: /ver estudio|scielo|Torres|Simirgiotis/i,
    });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
