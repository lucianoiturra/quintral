import { getSupabase } from "@/lib/supabase";

export async function uploadFoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const ruta = `${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from("fotos").upload(ruta, file);
  if (error) throw new Error(error.message);
  return supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
}
