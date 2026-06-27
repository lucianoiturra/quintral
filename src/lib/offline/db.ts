import { openDB, type IDBPDatabase } from "idb";
import type { PendingObservation, PendingPayload } from "@/lib/offline/types";

const DB_NAME = "quintral-offline";
const STORE = "observaciones_pendientes";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

function nuevoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function addPending(entrada: {
  payload: PendingPayload;
  fotoBlob: Blob | null;
  altitudGps: number | null;
  precision: number | null;
}): Promise<PendingObservation> {
  const registro: PendingObservation = {
    id: nuevoId(),
    payload: entrada.payload,
    fotoBlob: entrada.fotoBlob,
    altitudGps: entrada.altitudGps,
    precision: entrada.precision,
    estado: "pendiente",
    error: null,
    creadoEn: Date.now(),
  };
  const db = await getDb();
  await db.put(STORE, registro);
  return registro;
}

export async function listPending(): Promise<PendingObservation[]> {
  const db = await getDb();
  const todos = (await db.getAll(STORE)) as PendingObservation[];
  return todos.sort((a, b) => a.creadoEn - b.creadoEn);
}

export async function updatePending(
  id: string,
  patch: Partial<PendingObservation>,
): Promise<void> {
  const db = await getDb();
  const actual = (await db.get(STORE, id)) as PendingObservation | undefined;
  if (!actual) return;
  await db.put(STORE, { ...actual, ...patch, id });
}

export async function removePending(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}
