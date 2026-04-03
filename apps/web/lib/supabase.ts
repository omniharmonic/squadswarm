import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key, safe for browser)
export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Server-side Supabase client (uses service role key, server only)
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Storage bucket names
export const BUCKETS = {
  SCOPE_DOCUMENTS: 'scope-documents',
  DELIVERABLE_FILES: 'deliverable-files',
  AVATARS: 'avatars',
} as const;

// Upload a file to a Supabase storage bucket
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
  });

  if (error) throw error;
  return data;
}

// Get a signed URL for downloading a file
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
