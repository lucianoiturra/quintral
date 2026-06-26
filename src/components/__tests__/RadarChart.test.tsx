import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RadarChart from "@/components/RadarChart";

describe("RadarChart", () => {
  it("renderiza un svg accesible con etiquetas de eje", () => {
    render(
      <RadarChart
        ejes={["Polifenoles", "Flavonoides", "Antocianinas (n/d)"]}
        series={[{ nombre: "Muestra 1", color: "#c00", valores: [1, 0.99, null] }]}
      />,
    );
    const svg = screen.getByRole("img");
    expect(svg).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Muestra 1"),
    );
    expect(screen.getByText("Antocianinas (n/d)")).toBeInTheDocument();
  });
});
