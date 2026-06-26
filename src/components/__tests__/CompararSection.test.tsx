import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompararSection from "@/components/CompararSection";

describe("CompararSection", () => {
  it("muestra el título, la tabla con datos reales y antocianinas n/d", () => {
    render(<CompararSection />);
    expect(
      screen.getByRole("heading", {
        name: "Comparar compuestos entre hospederos",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/S-218-25/)).toBeInTheDocument();
    expect(screen.getAllByText("n/d").length).toBeGreaterThan(0);
  });
});
