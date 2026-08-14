export interface UploadedFile {
  /** Location the stored image is served from. Persisted on the member record. */
  url: string;
  fileName: string;
  size: number;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Use a PNG, JPG or WebP image.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "The image must be 2 MB or smaller.";
  }

  return null;
}

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf"];

export function validateDocument(file: File): string | null {
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
    return "Use a PDF document.";
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return "The document must be 5 MB or smaller.";
  }

  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

/** Human-readable size for the upload hints and stored-file summaries. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Uploads a member photo and returns the stored location.
 *
 * The mock transport keeps the bytes inline as a data URL so the app works offline.
 * Swap the body for the real endpoint once the backend exposes it:
 *
 *   const body = new FormData();
 *   body.append("file", file);
 *   const { data } = await httpClient.post<UploadedFile>("/uploads/images", body);
 *   return data;
 */
export async function uploadImage(file: File): Promise<UploadedFile> {
  const validationError = validateImage(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const url = await readAsDataUrl(file);

  return { url, fileName: file.name, size: file.size };
}

/**
 * Uploads a PDF (certificate template or a signed certificate) and returns the
 * stored location. Same swap point as `uploadImage`:
 *
 *   const body = new FormData();
 *   body.append("file", file);
 *   const { data } = await httpClient.post<UploadedFile>("/uploads/documents", body);
 *   return data;
 */
export async function uploadDocument(file: File): Promise<UploadedFile> {
  const validationError = validateDocument(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const url = await readAsDataUrl(file);

  return { url, fileName: file.name, size: file.size };
}
