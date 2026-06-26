export function isSafePhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const candidate = new URL(url);
    const expected = new URL(supabaseUrl);
    return (
      candidate.origin === expected.origin &&
      candidate.pathname.startsWith("/storage/v1/object/public/fotos/")
    );
  } catch {
    return false;
  }
}
