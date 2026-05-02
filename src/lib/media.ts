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

  const token = getAccessToken();
  const headers: Record<string, string> = {
    'x-blocks-key': X_BLOCKS_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Do NOT set Content-Type; browser sets it automatically with boundary for FormData

  // If we need progress tracking, use XMLHttpRequest
  if (onProgress) {
    return new Promise<MediaUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/storage/v1/Documents/Upload`);
      
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            // Selise might return the URL in different fields depending on config
            const publicUrl = data.url || data.fileUrl || data.publicUrl || data.result?.url || data.data?.url;
            
            if (!publicUrl) {
              console.error("Selise Media Upload Success but no URL found in response:", data);
              reject(new Error('Upload succeeded but no public URL was returned.'));
              return;
            }

            resolve({
              url: publicUrl,
              fileName: data.fileName || file.name,
              fileSize: data.fileSize || file.size,
              mimeType: data.mimeType || file.type,
              itemId: data.itemId,
            });
          } catch (err) {
            console.error("Failed to parse Selise Media response:", xhr.responseText);
            reject(new Error('Invalid JSON response from media server.'));
          }
        } else {
          console.error(`Selise Media Upload Failed (${xhr.status}):`, xhr.responseText);
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.message || errData.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        console.error("Network error during Selise Media Upload");
        reject(new Error('Network error. Check your connection or CORS settings.'));
      };
      xhr.send(formData);
    });
  }

  // Simple fetch for when progress is not needed
  const res = await fetch(`${API_BASE}/storage/v1/Documents/Upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Selise Media Upload (fetch) Failed (${res.status}):`, text);
    try {
      const errData = JSON.parse(text);
      throw new Error(errData.message || errData.error || `Upload failed (${res.status})`);
    } catch {
      throw new Error(`Upload failed (${res.status})`);
    }
  }

  const data = await res.json();
  const publicUrl = data.url || data.fileUrl || data.publicUrl || data.result?.url || data.data?.url;
  
  if (!publicUrl) {
    throw new Error('Upload succeeded but no public URL was returned.');
  }

  return {
    url: publicUrl,
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
