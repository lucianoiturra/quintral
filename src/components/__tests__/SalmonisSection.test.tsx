import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SalmonisSection from "@/components/SalmonisSection";
import { CURVAS, inhibicionMaxima } from "@/lib/salmonis";

describe("SalmonisSection", () => {
  it("muestra LF-89 por defecto y cambia de aislado al elegir otra pestaña", () => {
    render(<SalmonisSection />);
    expect(
      screen.getByRole("heading", { name: /Bacterias marinas/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /microplaca de p\. salmonis lf-89/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /12201/ }));
    expect(
      screen.getByRole("img", { name: /microplaca de p\. salmonis 12201/i }),
    ).toBeInTheDocument();
  });

  it("reporta la inhibición a 128 µg/mL de cada hospedero", () => {
    render(<SalmonisSection />);
    const lf89 = CURVAS.filter((c) => c.aislado === "lf89");
    for (const c of lf89) {
      expect(
        screen.getByText(`${inhibicionMaxima(c)}%`, { exact: false }),
      ).toBeInTheDocument();
    }
  });

  it("mantiene las cautelas: no afirma efecto bactericida ni CIM", () => {
    render(<SalmonisSection />);
    expect(screen.getByText(/no se puede afirmar que el extracto sea bactericida/)).toBeInTheDocument();
    expect(screen.getByText(/la CIM aún no está determinada/)).toBeInTheDocument();
  });
});
