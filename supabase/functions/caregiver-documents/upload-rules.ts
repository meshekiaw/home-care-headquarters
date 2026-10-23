export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_STEP_FILES = 2;

export function validateUpload(file: { name: string; size: number; type: string }): string | null {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) return "Choose a file up to 10 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string[]> = { pdf: ["application/pdf"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], heic: ["image/heic", "image/heif"] };
  if (!extension || !mimeTypes[extension] || (file.type && file.type !== "application/octet-stream" && !mimeTypes[extension].includes(file.type))) return "Choose a PDF, JPG, PNG, or HEIC file.";
  return null;
}

export async function hasValidFileHeader(file: Blob, name: string): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ext = name.split(".").pop()?.toLowerCase();
  const text = new TextDecoder().decode(bytes);
  if (ext === "pdf") return text.startsWith("%PDF-");
  if (ext === "jpg" || ext === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === "png") return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  if (ext === "heic") return text.slice(4, 8) === "ftyp" && /heic|heix|hevc|hevx|mif1/.test(text.slice(8));
  return false;
}