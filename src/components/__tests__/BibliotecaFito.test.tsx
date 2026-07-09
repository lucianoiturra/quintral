import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import BibliotecaFito from "@/components/BibliotecaFito";

describe("BibliotecaFito", () => {
  it("muestra la matriz-panorama y los 6 compuestos con su resumen", () => {
    render(<BibliotecaFito />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByText("Polifenoles").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Glicósidos").length).toBeGreaterThan(0);
    expect(screen.getByText(/defensa antioxidante de la planta/i)).toBeInTheDocument();
  });

  it("al pinchar el nombre del compuesto abre un modal con el detalle", () => {
    render(<BibliotecaFito />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Polifenoles" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/¿qué es\?/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/detectado en el quintral/i)).toBeInTheDocument();
  });

  it("el modal incluye enlaces a los estudios científicos", () => {
    render(<BibliotecaFito />);
    fireEvent.click(screen.getByRole("button", { name: "Polifenoles" }));

    const dialog = screen.getByRole("dialog");
    const enlaces = within(dialog).getAllByRole("link", {
      name: /ver estudio|scielo|Torres|Simirgiotis/i,
    });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const a of enlaces) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("cierra el modal con el botón cerrar", () => {
    render(<BibliotecaFito />);
    fireEvent.click(screen.getByRole("button", { name: "Polifenoles" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
