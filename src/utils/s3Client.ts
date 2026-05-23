import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';

export async function uploadToS3(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in to upload');

  // We are using Firebase Storage instead of S3 to ensure Netlify compatibility
  // without needing an Express backend.
  const fileExt = file.name.split('.').pop() || 'tmp';
  const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Decide folder based on file type
  const isVideo = file.type.startsWith('video/');
  const folder = isVideo ? 'videos' : 'images';
  
  const path = `${folder}/${user.uid}_${Date.now()}_${safeName}.${fileExt}`;
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
