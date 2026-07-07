import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MatrizFito from "@/components/MatrizFito";

describe("MatrizFito", () => {
  it("renderiza una tabla con los 6 compuestos y las 7 propiedades", () => {
    render(<MatrizFito />);
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByRole("columnheader", { name: "Antioxidante" })).toBeInTheDocument();
    expect(within(tabla).getByRole("rowheader", { name: "Polifenoles" })).toBeInTheDocument();
    expect(within(tabla).getByRole("rowheader", { name: "Glicósidos" })).toBeInTheDocument();
  });

  it("marca cada celda con texto accesible sí/no", () => {
    render(<MatrizFito />);
    // Polifenoles: 5 propiedades presentes de 7 -> hay celdas "sí" y "no"
    expect(screen.getAllByText("sí").length).toBeGreaterThan(0);
    expect(screen.getAllByText("no").length).toBeGreaterThan(0);
  });
});
