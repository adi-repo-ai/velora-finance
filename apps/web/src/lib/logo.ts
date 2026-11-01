/** Logo box size the app stores uploads at; displays are never larger than this. */
export const LOGO_PX = 128;

/**
 * Turns any image the browser can open (PNG, JPG, WebP, GIF, SVG…) into a 128×128 WebP data URL,
 * fitted inside the square. Re-encoding means only plain pixels are stored, never the original file.
 */
export async function fileToLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 5_000_000) throw new Error("Image must be under 5 MB");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => { throw new Error("That image couldn't be opened"); });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = LOGO_PX;
    const ctx = canvas.getContext("2d")!;
    const w = img.naturalWidth || LOGO_PX, h = img.naturalHeight || LOGO_PX;
    const scale = Math.min(LOGO_PX / w, LOGO_PX / h);
    ctx.drawImage(img, (LOGO_PX - w * scale) / 2, (LOGO_PX - h * scale) / 2, w * scale, h * scale);
    let out = canvas.toDataURL("image/webp", 0.86);
    // Older Safari can't encode WebP and silently returns PNG; both are accepted, just keep it small.
    if (out.length > 60_000) out = canvas.toDataURL("image/jpeg", 0.8);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
