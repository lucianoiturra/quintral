import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, isValidSessionMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  isValidSessionMock: vi.fn(),
}));

const selectChain = {
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  limit: vi.fn(),
};
const updateChain = {
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
};
const deleteChain = {
  eq: vi.fn(),
};

const fromMock = vi.fn();
const adminMock = { from: fromMock };

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/server/adminAuth", () => ({
  isValidSession: isValidSessionMock,
}));

vi.mock("@/lib/server/supabaseAdmin", () => ({
  getSupabaseAdmin: () => adminMock,
}));

import { GET as getObservaciones } from "@/app/api/admin/observaciones/route";
import {
  DELETE as deleteObservacion,
  PATCH as patchObservacion,
} from "@/app/api/admin/observaciones/[id]/route";
import { GET as getLog } from "@/app/api/admin/log/route";

function adminCookie(value = "valid") {
  cookiesMock.mockResolvedValue({
    get: (name: string) => (name === "admin_session" ? { value } : undefined),
  });
}

function observationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "obs-1",
    nombre_observador: "Ana",
    lat: -33.2,
    lng: -70.3,
    hospedero: "quillay",
    hospedero_otro: null,
    fenologia: "en flor",
    altitud: 1200,
    exposicion_solar: "norte",
    foto_url: null,
    resultado_ia: null,
    cerro: "Manquehue",
    creado_en: "2026-06-24T00:00:00Z",
    oculta: false,
    verificada: false,
    notas_admin: null,
    editado_en: null,
    ...overrides,
  };
}

describe("admin observaciones routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminCookie();
    isValidSessionMock.mockResolvedValue(true);

    selectChain.eq.mockReturnValue(selectChain);
    selectChain.order.mockReturnValue(selectChain);
    selectChain.single.mockResolvedValue({ data: observationRow(), error: null });
    selectChain.limit.mockResolvedValue({ data: [], error: null });

    updateChain.eq.mockReturnValue(updateChain);
    updateChain.select.mockReturnValue(updateChain);
    updateChain.single.mockResolvedValue({ data: observationRow({ oculta: true }), error: null });

    deleteChain.eq.mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "observaciones") {
        return {
          select: vi.fn(() => selectChain),
          update: vi.fn(() => updateChain),
          delete: vi.fn(() => deleteChain),
        };
      }

      if (table === "admin_log") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn(() => selectChain),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });
  });

  it("GET /api/admin/observaciones devuelve 401 si la cookie no es valida", async () => {
    isValidSessionMock.mockResolvedValue(false);
    const response = await getObservaciones();
    expect(response.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("GET /api/admin/observaciones devuelve observaciones incluyendo ocultas", async () => {
    selectChain.order.mockResolvedValue({
      data: [observationRow({ oculta: true }), observationRow({ id: "obs-2", verificada: true })],
      error: null,
    });

    const response = await getObservaciones();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].oculta).toBe(true);
    expect(data[1].verificada).toBe(true);
  });

  it("PATCH /api/admin/observaciones/[id] alterna verificada", async () => {
    updateChain.single.mockResolvedValue({
      data: observationRow({ verificada: true, editado_en: "2026-06-26T00:00:00Z" }),
      error: null,
    });

    const request = new Request("http://localhost/api/admin/observaciones/obs-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "toggle_verificada" }),
      headers: { "content-type": "application/json" },
    });

    const response = await patchObservacion(request, {
      params: Promise.resolve({ id: "obs-1" }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.verificada).toBe(true);
  });

  it("DELETE /api/admin/observaciones/[id] borra la observacion", async () => {
    const request = new Request("http://localhost/api/admin/observaciones/obs-1", {
      method: "DELETE",
    });

    const response = await deleteObservacion(request, {
      params: Promise.resolve({ id: "obs-1" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("GET /api/admin/log devuelve 401 antes de tocar la base de datos si no hay sesion", async () => {
    isValidSessionMock.mockResolvedValue(false);
    const response = await getLog();
    expect(response.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
