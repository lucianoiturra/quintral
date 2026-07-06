import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FaqSection from "@/components/FaqSection";
import { FAQ } from "@/lib/faq";

describe("FaqSection", () => {
  it("renderiza el encabezado y una entrada por cada pregunta", () => {
    render(<FaqSection />);
    expect(
      screen.getByRole("heading", { name: /preguntas frecuentes/i }),
    ).toBeInTheDocument();
    for (const item of FAQ) {
      expect(screen.getByText(item.pregunta)).toBeInTheDocument();
    }
  });

  it("expone la sección con id 'preguntas'", () => {
    const { container } = render(<FaqSection />);
    expect(container.querySelector("section#preguntas")).not.toBeNull();
  });
});
