import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrediccionSection from "@/components/PrediccionSection";

describe("PrediccionSection", () => {
  it("revela el perfil de referencia tras enviar el formulario", () => {
    render(<PrediccionSection />);
    expect(
      screen.queryByText(/no medición de tu ejemplar/),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /perfil de referencia/i }),
    );

    expect(
      screen.getByText(/no medición de tu ejemplar/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Perfil de referencia para un ejemplar en Aromo/,
      }),
    ).toBeInTheDocument();
  });
});
