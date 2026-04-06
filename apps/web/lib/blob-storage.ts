import { put, del } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage.
 * Falls back to data URI if BLOB_READ_WRITE_TOKEN is not set (local dev).
 */
export async function uploadToBlob(
  fileName: string,
  content: Buffer | string,
  contentType: string = 'application/octet-stream'
): Promise<{ url: string; pathname: string }> {
  // Graceful fallback for local dev without Vercel Blob token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const base64 =
      typeof content === 'string'
        ? Buffer.from(content, 'utf-8').toString('base64')
        : content.toString('base64');
    const dataUri = `data:${contentType};base64,${base64}`;
    return { url: dataUri, pathname: `squadswarm/${Date.now()}-${fileName}` };
  }

  const blob = await put(`squadswarm/${Date.now()}-${fileName}`, content, {
    access: 'public',
    contentType,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/**
 * Delete a file from Vercel Blob storage.
 * No-ops if the URL is a data URI or if the blob is already deleted.
 */
export async function deleteFromBlob(url: string): Promise<void> {
  // Don't attempt to delete data URIs (local dev fallback)
  if (url.startsWith('data:')) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  try {
    await del(url);
  } catch {
    /* ignore — blob may already be deleted */
  }
}
