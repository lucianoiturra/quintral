import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OdChart from "@/components/OdChart";

describe("OdChart", () => {
  it("dibuja una barra por (categoría × serie) y resume los datos en aria-label", () => {
    const { container } = render(
      <OdChart
        categorias={["0", "1024"]}
        series={[
          { nombre: "Litre", color: "#a00", valores: [0.5, 0.69] },
          { nombre: "Quillay", color: "#0a0", valores: [0.61, 0.66] },
        ]}
        maxY={0.8}
      />,
    );
    expect(container.querySelectorAll("rect.od-bar")).toHaveLength(4);
    const svg = screen.getByRole("img");
    const label = svg.getAttribute("aria-label") ?? "";
    expect(label).toContain("Litre");
    expect(label).toContain("0.69");
  });
});
