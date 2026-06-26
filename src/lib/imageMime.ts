export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

const EXTENSION_TO_MIME: Record<string, AllowedImageType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function normalizeImageMediaType(mediaType: string | null | undefined): AllowedImageType | null {
  const normalized = mediaType?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "image/jpg") return "image/jpeg";
  return ALLOWED_IMAGE_TYPES.includes(normalized as AllowedImageType)
    ? (normalized as AllowedImageType)
    : null;
}

export function inferImageMediaType(
  file: { name?: string | null; type?: string | null },
  dataUrlMediaType?: string | null,
): AllowedImageType | null {
  const fromDataUrl = normalizeImageMediaType(dataUrlMediaType);
  if (fromDataUrl) return fromDataUrl;

  const fromFileType = normalizeImageMediaType(file.type);
  if (fromFileType) return fromFileType;

  const match = /\.([A-Za-z0-9]+)$/.exec(file.name ?? "");
  if (!match) return null;

  return EXTENSION_TO_MIME[match[1].toLowerCase()] ?? null;
}
