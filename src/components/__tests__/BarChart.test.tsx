import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BarChart from "@/components/BarChart";

describe("BarChart", () => {
  it("muestra el valor con unidad y marca n/d", () => {
    render(
      <BarChart
        barras={[
          { etiqueta: "Polifenoles", valor: 52.8, unidad: "mg EAG/g", color: "#2a2" },
          { etiqueta: "Antocianinas", valor: null, unidad: "mg Cy3Glu/g", color: "#2a2" },
        ]}
      />,
    );
    expect(screen.getByText("52.8 mg EAG/g")).toBeInTheDocument();
    expect(screen.getByText("n/d")).toBeInTheDocument();
  });
});
