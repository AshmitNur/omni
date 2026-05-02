/**
 * Selise Media Block API Client
 * Handles file uploads (images) to Selise Storage/Media Block.
 * 
 * On upload success, returns a permanent public URL that can be stored
 * in the Content Block fields (profile_image_url, header_image_url, etc.).
 */

import { getAccessToken } from './blocks';

const API_BASE = import.meta.env.VITE_BLOCKS_API_URL || 'https://api.seliseblocks.com';
const X_BLOCKS_KEY = import.meta.env.VITE_X_BLOCKS_KEY || '';

export interface MediaUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  itemId?: string;
}

// ─── Upload a file to Selise Media Block ───────────────────────
export async function uploadMedia(
  file: File,
  folder: string = 'vibe-uploads',
  onProgress?: (percent: number) => void
): Promise<MediaUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('isPublic', 'true');

  // Move project key to query param to avoid custom headers (triggers CORS preflight)
  const uploadUrl = new URL(`${API_BASE}/storage/v1/Files/Upload`);
  uploadUrl.searchParams.append('projectKey', X_BLOCKS_KEY);
  uploadUrl.searchParams.append('folder', folder);
  uploadUrl.searchParams.append('isPublic', 'true');

  // Using fetch with NO custom headers to try and trigger a "Simple Request" (no preflight)
  const res = await fetch(uploadUrl.toString(), {
    method: 'POST',
    body: formData,
    // Note: Do NOT add headers here if we want to bypass preflight
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Selise Media Upload Failed (${res.status}):`, text);
    try {
      const errData = JSON.parse(text);
      throw new Error(errData.message || errData.error || `Upload failed (${res.status})`);
    } catch {
      throw new Error(`Upload failed (${res.status})`);
    }
  }

  const data = await res.json();
  const publicUrl = data.url || data.fileUrl || data.publicUrl || data.result?.url || data.data?.url || data.path;
  
  if (!publicUrl) {
    console.error("Upload succeeded but no URL found in response:", data);
    throw new Error('Upload succeeded but no public URL was returned.');
  }

  // If the path is relative, prefix it with the API_BASE
  const finalUrl = publicUrl.startsWith('http') 
    ? publicUrl 
    : (API_BASE.startsWith('http') ? `${API_BASE}${publicUrl}` : `${window.location.origin}${API_BASE}${publicUrl}`);

  // Fake progress completion for UI
  if (onProgress) onProgress(100);

  return {
    url: finalUrl,
    fileName: data.fileName || file.name,
    fileSize: data.fileSize || file.size,
    mimeType: data.mimeType || file.type,
    itemId: data.itemId,
  };
}

// ─── Fallback: Convert file to base64 data URL ────────────────
// Used as a graceful degradation when Media Block is unavailable.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
