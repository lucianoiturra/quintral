import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContributeForm from "@/components/ContributeForm";
import type { PendingPayload } from "@/lib/offline/types";

type OnQueueArg = {
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
};

describe("ContributeForm (offline-first)", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: -33.2, longitude: -70.3, altitude: 1180.6, accuracy: 7, altitudeAccuracy: 12 },
          } as GeolocationPosition),
      },
    });
  });

  it("captura altitud GPS al usar la ubicación", () => {
    render(<ContributeForm prefill={null} onQueue={vi.fn(async () => {})} />);
    fireEvent.click(screen.getByText("Usar mi ubicación"));
    expect((screen.getByPlaceholderText("-33.21") as HTMLInputElement).value).toBe("-33.2");
    expect((screen.getByPlaceholderText("1200") as HTMLInputElement).value).toBe("1181");
  });

  it("encola la observación al enviar (no la sube directo)", async () => {
    const onQueue = vi.fn<(arg: OnQueueArg) => Promise<void>>(async () => {});
    render(<ContributeForm prefill={null} onQueue={onQueue} />);
    fireEvent.change(screen.getByPlaceholderText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("Usar mi ubicación"));
    fireEvent.change(screen.getByPlaceholderText("Floración, fruto…"), { target: { value: "fruto" } });
    fireEvent.click(screen.getByText("Enviar observación"));
    await waitFor(() => expect(onQueue).toHaveBeenCalledOnce());
    const arg = onQueue.mock.calls[0][0];
    expect(arg.altitudGps).toBe(1181);
    expect(arg.precision).toBe(7);
    expect(arg.payload.nombreObservador).toBe("Ana");
    await screen.findByText(/se subirá al volver/i);
  });
});
