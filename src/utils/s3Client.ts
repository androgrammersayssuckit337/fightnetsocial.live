export async function uploadToS3(file: File): Promise<string> {
  // 1. Get presigned URL
  const res = await fetch('/api/s3/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream'
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get S3 presigned URL');
  }

  const { uploadUrl, publicUrl } = await res.json();

  // 2. Upload directly to S3
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('S3 upload failed');
  }

  // 3. Return the public URL
  return publicUrl;
}
