import { inferImageMediaType } from "@/lib/imageMime";

export function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const match = /^data:([^;]*);base64,(.*)$/s.exec(result);
      if (!match) return reject(new Error("No se pudo leer la imagen"));

      const mediaType = inferImageMediaType(file, match[1]);
      if (!mediaType) return reject(new Error("No se pudo identificar el tipo de imagen"));

      resolve({ mediaType, base64: match[2] });
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}
