'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface FileItem {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSizeBytes: number | null;
  version: number;
  uploadedBy: string;
  isAgent: boolean;
  createdAt: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('');
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return (
        <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'fig':
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      );
    case 'md':
      return (
        <svg className="w-5 h-5 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

export default function FilesPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      }
    } catch {
      // Leave files empty on failure
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/contracts/${contractId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const newFile: FileItem = await res.json();
      setFiles((prev) => [newFile, ...prev]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    const first = droppedFiles[0];
    if (droppedFiles.length > 0 && first) {
      uploadFile(first);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    const first = selectedFiles?.[0];
    if (first) {
      uploadFile(first);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Files</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
            Shared files and deliverables for this contract.
          </Link>
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer ${
          isDragging
            ? 'border-accent-agent bg-accent-agent/5'
            : 'border-border bg-white hover:border-accent-agent/40'
        } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        {uploading ? (
          <>
            <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">Uploading...</p>
          </>
        ) : (
          <>
            <svg className="w-10 h-10 text-text-secondary mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p className="text-sm font-medium text-text-primary mb-1">Drag and drop files here</p>
            <p className="text-xs text-text-secondary">or click to browse</p>
          </>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-lg text-sm text-error">
          {uploadError}
        </div>
      )}

      {/* File List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-8 space-y-4">
          <div className="h-5 w-48 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-full bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-bg-secondary rounded animate-pulse" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No files yet</h3>
          <p className="text-text-secondary text-sm">Upload files to share them with the team.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border divide-y divide-border">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-4 p-4">
              {/* File Icon */}
              <div className="shrink-0">{getFileIcon(file.fileName)}</div>

              {/* File Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{file.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-secondary">{formatFileSize(file.fileSizeBytes)}</span>
                  <span className="text-xs text-text-secondary">&middot;</span>

                  {/* Uploader Avatar */}
                  {file.isAgent ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-3.5 h-3.5 bg-accent-agent/15 border border-accent-agent/30 rounded-sm rotate-45">
                        <span className="block -rotate-45 text-[6px] font-bold text-accent-agent text-center leading-[14px]">
                          {getInitials(file.uploadedBy)}
                        </span>
                      </span>
                      <span className="text-xs text-accent-agent">{file.uploadedBy} (Agent)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-flex w-3.5 h-3.5 bg-bg-secondary rounded-full items-center justify-center">
                        <span className="text-[6px] font-bold text-text-secondary">{getInitials(file.uploadedBy)}</span>
                      </span>
                      <span className="text-xs text-text-secondary">{file.uploadedBy}</span>
                    </span>
                  )}

                  <span className="text-xs text-text-secondary">&middot;</span>
                  <span className="text-xs text-text-secondary">{formatRelativeTime(file.createdAt)}</span>
                </div>
              </div>

              {/* Download Button */}
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
