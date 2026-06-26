import { describe, it, expect, vi } from "vitest";
import { fileToBase64 } from "@/lib/fileToBase64";

describe("fileToBase64", () => {
  it("acepta data URLs sin MIME si puede inferirlo por extension", async () => {
    class FR {
      result = "data:;base64,QUJD";
      onload: (() => void) | null = null;
      readAsDataURL() { this.onload?.(); }
    }
    vi.stubGlobal("FileReader", FR);
    const file = { name: "x.webp", type: "" } as File;
    const out = await fileToBase64(file);
    expect(out).toEqual({ base64: "QUJD", mediaType: "image/webp" });
  });

  it("separa mediaType y datos de un data URL", async () => {
    class FR {
      result = "data:image/png;base64,QUJD";
      onload: (() => void) | null = null;
      readAsDataURL() { this.onload?.(); }
    }
    vi.stubGlobal("FileReader", FR);
    const file = { name: "x.png" } as File;
    const out = await fileToBase64(file);
    expect(out).toEqual({ base64: "QUJD", mediaType: "image/png" });
  });
});
