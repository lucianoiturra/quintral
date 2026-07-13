import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AntibacterianoSection from "@/components/AntibacterianoSection";

describe("AntibacterianoSection", () => {
  it("muestra E. coli por defecto y cambia al elegir otra bacteria", () => {
    render(<AntibacterianoSection />);
    expect(
      screen.getByRole("heading", { name: /Actividad antibacteriana/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Escherichia coli/).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("tab", { name: /Staphylococcus aureus/ }),
    );
    expect(screen.getAllByText(/Staphylococcus aureus/).length).toBeGreaterThan(0);
  });

  it("declara que los datos son leídos de figura e incluye las bacterias marinas", () => {
    render(<AntibacterianoSection />);
    expect(screen.getAllByText(/leídas de las figuras/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /Bacterias marinas/ }),
    ).toBeInTheDocument();
  });
});
