export async function uploadFoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/photo", {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !payload?.url) {
    throw new Error(payload?.error ?? "No se pudo subir la foto.");
  }

  return payload.url;
}
