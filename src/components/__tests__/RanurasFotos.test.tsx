import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RanurasFotos from "@/components/RanurasFotos";

const vacios = { corteza: null, hoja: null, arbol: null, fruto: null };

describe("RanurasFotos", () => {
  it("muestra las 4 ranuras", () => {
    render(<RanurasFotos archivos={vacios} onCambio={() => {}} />);
    expect(screen.getByText("Corteza")).toBeInTheDocument();
    expect(screen.getByText("Hoja (de cerca)")).toBeInTheDocument();
    expect(screen.getByText("Árbol completo")).toBeInTheDocument();
    expect(screen.getByText("Fruto o flor")).toBeInTheDocument();
  });

  it("emite onCambio con un archivo válido", () => {
    const onCambio = vi.fn();
    render(<RanurasFotos archivos={vacios} onCambio={onCambio} />);
    const file = new File(["x"], "corteza.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("Subir Corteza") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCambio).toHaveBeenCalledWith("corteza", file);
  });

  it("rechaza archivos no permitidos llamando a error y no a onCambio", () => {
    const onCambio = vi.fn();
    const error = vi.fn();
    render(<RanurasFotos archivos={vacios} onCambio={onCambio} error={error} />);
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText("Subir Corteza") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onCambio).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
