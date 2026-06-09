import React, { useState, useRef, useEffect } from 'react';
import { Target, Award, Zap, Edit2, Save, X, Camera, Loader2, Sparkles, Video, FileText, Plus, Trash2, Check, CheckCircle2, Circle, Calendar, Link as LinkIcon, Download, ListTodo, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { uploadToS3 } from '../../utils/s3Client';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { motion, AnimatePresence } from 'motion/react';
import { PromoGenerator } from '../PromoGenerator';
import _ReactPlayer from 'react-player';
const ReactPlayer = _ReactPlayer as any;

export function CareerPage() {
  const { currentUser, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const contractFileRef = useRef<HTMLInputElement>(null);
  const [contractUploadProgress, setContractUploadProgress] = useState(0);
  const [contractData, setContractData] = useState({
    opponent: '',
    date: '',
    promotion: '',
    payout: '',
    contractUrl: ''
  });

  const [videoClips, setVideoClips] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoSortOption, setVideoSortOption] = useState('newest');
  const videoFileRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: ''
  });
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoDescription, setEditVideoDescription] = useState('');

  const [trainingTasks, setTrainingTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    gym: userProfile?.gym || '',
    record: userProfile?.record || '',
    isPro: userProfile?.isPro || false,
    profileImageUrl: userProfile?.profileImageUrl || '',
    role: userProfile?.role || 'fan',
    socialLinks: {
      instagram: userProfile?.socialLinks?.instagram || '',
      twitter: userProfile?.socialLinks?.twitter || '',
      youtube: userProfile?.socialLinks?.youtube || ''
    }
  });

  useEffect(() => {
    if (!currentUser || userProfile?.role !== 'fighter') return;

    const fetchContracts = async () => {
      setLoadingContracts(true);
      try {
        const q = query(collection(db, 'contracts'), where('fighterId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedContracts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setContracts(fetchedContracts);
      } catch (err) {
        console.error("Failed to fetch contracts", err);
      } finally {
        setLoadingContracts(false);
      }
    };

    const fetchVideos = async () => {
      setLoadingVideos(true);
      try {
        const q = query(collection(db, 'videoClips'), where('fighterId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedVideos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVideoClips(fetchedVideos);
      } catch (err) {
        console.error("Failed to fetch videos", err);
      } finally {
        setLoadingVideos(false);
      }
    };

    const fetchTasks = async () => {
      setLoadingTasks(true);
      try {
        const q = query(collection(db, 'trainingTasks'), where('fighterId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedTasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // sort tasks, unfinished first, then chronological
        fetchedTasks.sort((a: any, b: any) => {
          if (a.completed === b.completed) {
            return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
          }
          return a.completed ? 1 : -1;
        });
        setTrainingTasks(fetchedTasks);
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchContracts();
    fetchVideos();
    fetchTasks();
  }, [currentUser, userProfile?.role]);

  const getMimeType = (file: File) => {
    if (file.type) return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'wmv': return 'video/x-ms-wmv';
      case 'webm': return 'video/webm';
      case 'mkv': return 'video/x-matroska';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'pdf': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 200 * 1024 * 1024) {
      alert("Video file too large. Max 200MB.");
      return;
    }

    let fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const fileName = `videos/${auth.currentUser.uid}_${Date.now()}.${fileExt || 'mp4'}`;
    const storageRef = ref(storage, fileName);
    
    let mimeType = getMimeType(file);
    if (!mimeType.startsWith('video/')) mimeType = 'video/mp4';
    const metadata = { contentType: mimeType };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setVideoUploadProgress(progress);
      }, 
      (error) => {
        console.error("Video Upload Error:", error);
        alert(`Upload failed: ${error.message}`);
        setVideoUploadProgress(0);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setVideoData(prev => ({ ...prev, videoUrl: downloadURL }));
          setVideoUploadProgress(0);
        } catch (err: any) {
          console.error("Error getting download URL:", err);
          setVideoUploadProgress(0);
        }
      }
    );
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Thumbnail file too large. Max 5MB.");
      return;
    }

    let fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const fileName = `thumbnails/${auth.currentUser.uid}_${Date.now()}.${fileExt || 'jpg'}`;
    const storageRef = ref(storage, fileName);
    
    let mimeType = getMimeType(file);
    if (!mimeType.startsWith('image/')) mimeType = 'image/jpeg';
    const metadata = { contentType: mimeType };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setThumbnailUploadProgress(progress);
      }, 
      (error) => {
        console.error("Thumbnail Upload Error:", error);
        alert(`Upload failed: ${error.message}`);
        setThumbnailUploadProgress(0);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setVideoData(prev => ({ ...prev, thumbnailUrl: downloadURL }));
          setThumbnailUploadProgress(0);
        } catch (err: any) {
          console.error("Error getting download URL:", err);
          setThumbnailUploadProgress(0);
        }
      }
    );
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !videoData.videoUrl) return;
    try {
      await addDoc(collection(db, 'videoClips'), {
        fighterId: auth.currentUser.uid,
        ...videoData,
        createdAt: serverTimestamp()
      });
      setShowAddVideo(false);
      setVideoData({ title: '', description: '', videoUrl: '', thumbnailUrl: '' });
      // Refresh videos
      const q = query(collection(db, 'videoClips'), where('fighterId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setVideoClips(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videoClips', auth);
    }
  };

  const handleAddTrainingTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTaskTitle.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'trainingTasks'), {
        fighterId: auth.currentUser.uid,
        title: newTaskTitle.trim(),
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTaskTitle('');
      setTrainingTasks(prev => [{ id: docRef.id, fighterId: auth.currentUser?.uid, title: newTaskTitle.trim(), completed: false, createdAt: { toMillis: () => Date.now() } }, ...prev]);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'trainingTasks', auth);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (!auth.currentUser) return;
    try {
      const taskRef = doc(db, 'trainingTasks', taskId);
      await updateDoc(taskRef, { completed: !currentStatus });
      
      setTrainingTasks(prev => {
        const updated = prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t);
        return updated.sort((a, b) => {
          if (a.completed === b.completed) {
            return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
          }
          return a.completed ? 1 : -1;
        });
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `trainingTasks/${taskId}`, auth);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'trainingTasks', taskId));
      setTrainingTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `trainingTasks/${taskId}`, auth);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'videoClips', videoId));
      setVideoClips(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `videoClips/${videoId}`, auth);
    }
  };

  const handleEditVideoStart = (clip: any) => {
    setEditingVideoId(clip.id);
    setEditVideoTitle(clip.title || '');
    setEditVideoDescription(clip.description || '');
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoId || !auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'videoClips', editingVideoId), {
        title: editVideoTitle,
        description: editVideoDescription
      });
      setVideoClips(prev => prev.map(c => c.id === editingVideoId ? { ...c, title: editVideoTitle, description: editVideoDescription } : c));
      setEditingVideoId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videoClips/${editingVideoId}`, auth);
    }
  };

  const handleCancelEditVideo = () => {
      setEditingVideoId(null);
      setEditVideoTitle('');
      setEditVideoDescription('');
  };

  const handleShareVideo = async (clip: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: clip.title || 'Check out my performance tape',
          text: clip.description || `Watch this performance tape by ${userProfile?.displayName || 'me'}!`,
          url: clip.videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(clip.videoUrl);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB.");
      return;
    }

    let fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const fileName = `contracts/${auth.currentUser.uid}_${Date.now()}.${fileExt || 'pdf'}`;
    const storageRef = ref(storage, fileName);
    
    let mimeType = getMimeType(file);
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
       mimeType = fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg';
    }
    const metadata = { contentType: mimeType };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setContractUploadProgress(progress);
      }, 
      (error) => {
        console.error("Contract Upload Error:", error);
        alert(`Upload failed: ${error.message}`);
        setContractUploadProgress(0);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setContractData(prev => ({ ...prev, contractUrl: downloadURL }));
          setContractUploadProgress(0);
        } catch (err: any) {
          console.error("Error getting download URL:", err);
          setContractUploadProgress(0);
        }
      }
    );
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'contracts'), {
        fighterId: auth.currentUser.uid,
        ...contractData,
        createdAt: serverTimestamp()
      });
      setShowAddContract(false);
      setContractData({ opponent: '', date: '', promotion: '', payout: '', contractUrl: '' });
      // Refresh contracts
      const q = query(collection(db, 'contracts'), where('fighterId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setContracts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contracts', auth);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'contracts', contractId));
      setContracts(prev => prev.filter(c => c.id !== contractId));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `contracts/${contractId}`, auth);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `profiles/${auth.currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    const metadata = { contentType: getMimeType(file) };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        setIsUploading(false);
        alert(`Upload failed: ${error.message}. Check storage rules.`);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, profileImageUrl: downloadURL }));
          setIsUploading(false);
          setUploadProgress(0);
          
          if (!isEditing && auth.currentUser) {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              await updateDoc(userRef, { profileImageUrl: downloadURL });
              window.location.reload();
          }
        } catch (err: any) {
          console.error("Error getting download URL:", err);
          setIsUploading(false);
          alert(`Failed to get download URL: ${err.message}`);
        }
      }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, formData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 bg-[#0a0a0a] min-h-full scrollbar-hide max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-2 h-12 bg-[#E31837] italic shadow-[0_0_20px_rgba(227,24,55,0.4)]"></div>
           <div>
             <h1 className="text-3xl font-black uppercase text-white tracking-tighter italic leading-none mb-2">Combat Persona</h1>
             <p className="text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-black">Refining the Bridge to Professional Glory</p>
           </div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isEditing ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-black hover:bg-zinc-200 shadow-xl'}`}
        >
          {isEditing ? <><X className="w-4 h-4" /> Discard Changes</> : <><Edit2 className="w-4 h-4" /> Refine Identity</>}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.form 
            key="editing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleUpdateProfile} 
            className="space-y-8"
          >
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Image and Basic Info */}
                <div className="lg:col-span-1 space-y-8">
                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative group mb-6">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#E31837] to-red-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <img 
                         src={formData.profileImageUrl || `https://ui-avatars.com/api/?name=${formData.displayName}&background=0c0c0c&color=fff`} 
                         className="relative w-40 h-40 rounded-full border-4 border-black object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105" 
                         alt="Profile"
                        />
                        <button 
                         type="button"
                         onClick={() => fileInputRef.current?.click()}
                         className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                          ) : (
                            <Camera className="w-8 h-8 text-white" />
                          )}
                        </button>
                        <input 
                         type="file" 
                         ref={fileInputRef} 
                         onChange={handleProfilePicUpload} 
                         className="hidden" 
                         accept="image/*"
                        />
                      </div>
                      <h3 className="text-xl font-black uppercase italic text-white mb-2 relative z-10">{formData.displayName || 'Unnamed Combatant'}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-[200px] relative z-10">Update your visual identity for agent discovery</p>
                      
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-zinc-900 h-1 rounded-full mt-6 overflow-hidden relative z-10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="bg-[#E31837] h-full shadow-[0_0_10px_#E31837]" 
                          />
                        </div>
                      )}
                   </div>

                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl space-y-6">
                      <div className="space-y-4">
                         <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Fighter Status</label>
                         <div className="grid grid-cols-1 gap-3">
                            {['fighter', 'fan', 'sponsor', 'agent'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setFormData({...formData, role: role as any})}
                                className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all ${formData.role === role ? 'bg-[#E31837] border-[#E31837] text-white shadow-lg' : 'bg-black border-white/5 text-zinc-500 hover:border-zinc-700'}`}
                              >
                                {role} Account
                              </button>
                            ))}
                         </div>
                         <p className="text-[9px] text-zinc-600 font-bold mt-2 italic">Role updates help agents categorize your performance tape.</p>
                      </div>
                   </div>
                </div>

                {/* Extended Bio and Stats */}
                <div className="lg:col-span-2 space-y-8">
                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 space-y-8">
                         <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                           <Zap className="w-5 h-5 text-[#E31837]" />
                           Vital Combat Data
                         </h2>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Display Name</label>
                               <input 
                                 value={formData.displayName} 
                                 onChange={e => setFormData({...formData, displayName: e.target.value})}
                                 placeholder="The Shadow"
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                            
                            {formData.role === 'fighter' && (
                              <>
                                <div className="space-y-2">
                                   <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Current Record (W-L-D)</label>
                                   <input 
                                     value={formData.record} 
                                     onChange={e => setFormData({...formData, record: e.target.value})}
                                     placeholder="12-0-3"
                                     className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all font-mono"
                                   />
                                </div>
                                <div className="space-y-2 flex flex-col justify-end">
                                   <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1 mb-2">Pro Status</label>
                                   <label className="flex items-center gap-3 cursor-pointer group">
                                     <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.isPro ? 'bg-[#E31837]' : 'bg-white/10'}`}>
                                       <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.isPro ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                     </div>
                                     <span className="text-sm font-bold uppercase tracking-tight text-white group-hover:text-[#E31837] transition-colors">
                                       {formData.isPro ? 'Professional Fighter' : 'Amateur Fighter'}
                                     </span>
                                     <input type="checkbox" className="hidden" checked={formData.isPro} onChange={(e) => setFormData({...formData, isPro: e.target.checked})} />
                                   </label>
                                </div>
                              </>
                            )}

                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Primary Training Facility</label>
                               <input 
                                 value={formData.gym} 
                                 onChange={e => setFormData({...formData, gym: e.target.value})}
                                 placeholder="MMA Factory LA"
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Combat Bio / Mission Statement</label>
                            <textarea 
                              value={formData.bio} 
                              onChange={e => setFormData({...formData, bio: e.target.value})}
                              placeholder="Tell promoters and fans who you are, what you fight for, and why you're the next big prospect."
                              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all resize-none min-h-[150px] leading-relaxed"
                            />
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Instagram URL</label>
                               <input 
                                 value={formData.socialLinks.instagram} 
                                 onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, instagram: e.target.value}})}
                                 placeholder="https://instagram.com/..."
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Twitter Target</label>
                               <input 
                                 value={formData.socialLinks.twitter} 
                                 onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, twitter: e.target.value}})}
                                 placeholder="https://twitter.com/..."
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">YouTube Channel</label>
                               <input 
                                 value={formData.socialLinks.youtube} 
                                 onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, youtube: e.target.value}})}
                                 placeholder="https://youtube.com/@..."
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                         </div>

                         <div className="pt-4">
                            <button type="submit" className="flex items-center gap-3 bg-[#E31837] text-white font-black uppercase italic tracking-tighter text-sm px-10 py-4 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-900/40 group/save">
                              <Save className="w-5 h-5 group-hover/save:scale-110 transition-transform" />
                              Lock Identity Updates
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.form>
        ) : (
          <motion.div 
            key="display"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="space-y-12"
          >
          <div className="flex flex-col md:flex-row gap-8 mb-12 items-center md:items-start">
             <div className="relative">
                <img 
                  src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile?.displayName}&background=0c0c0c&color=fff`} 
                  className="w-32 h-32 rounded-full border-4 border-zinc-800 object-cover" 
                  alt="Profile"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#E31837] text-white p-1.5 rounded-full border-2 border-[#0a0a0a]">
                   <Award className="w-4 h-4" />
                </div>
             </div>
             <div className="text-center md:text-left">
                <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter mb-2">{userProfile?.displayName}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                   <div className="text-[10px] uppercase font-bold tracking-widest text-[#E31837] bg-red-900/10 px-2 py-1 rounded">ROLE: {userProfile?.role}</div>
                   <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded">GYM: {userProfile?.gym || 'NOT LISTED'}</div>
                   <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded">RECORD: {userProfile?.record || '0-0-0'}</div>
                </div>
                <p className="mt-4 text-sm text-zinc-400 max-w-lg leading-relaxed">{userProfile?.bio || 'No bio provided. Update your fighter profile to get noticed.'}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center space-y-4 hover:border-[#E31837] transition-colors rounded-lg">
              <Target className="w-8 h-8 text-[#E31837]" />
              <h2 className="text-lg font-black uppercase tracking-tight">Record: {userProfile?.record || '0-0-0'}</h2>
              <p className="text-xs text-zinc-400 max-w-sm">Verified bout tracking and performance analytics. Get regional promoters' eyes on you.</p>
              <div className="text-[10px] font-bold text-zinc-500 uppercase mt-2">Gym: {userProfile?.gym || 'Private'}</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center space-y-4 hover:border-[#E31837] transition-colors relative overflow-hidden rounded-lg">
              <Award className="w-8 h-8 text-[#E31837] relative z-10" />
              <h2 className="text-lg font-black uppercase tracking-tight relative z-10">Pro Status Assessment</h2>
              <p className="text-xs text-zinc-400 max-w-sm relative z-10">Submit your tape and stats to our advocating agents to see if you're ready to bridge to Pro.</p>
              <button 
                onClick={() => {
                  setShowAddVideo(true);
                  setTimeout(() => {
                    document.getElementById('video-clips-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }} 
                className="bg-[#E31837] px-6 py-2 uppercase text-[10px] font-bold mt-4 hover:bg-red-700 text-white w-full rounded relative z-10 border border-white/10 shadow-[0_0_15px_rgba(227,24,55,0.2)]"
              >
                Submit Tape
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center space-y-4 hover:border-[#E31837] transition-colors relative overflow-hidden rounded-lg">
              <Video className="w-8 h-8 text-[#E31837] relative z-10" />
              <h2 className="text-lg font-black uppercase tracking-tight relative z-10">Promo Generator AI</h2>
              <p className="text-xs text-zinc-400 max-w-sm relative z-10">Generate a cinematic promotional video for your next fight using Google Veo.</p>
              <button onClick={() => setShowVideoModal(true)} className="bg-white px-6 py-2 uppercase text-[10px] text-black font-bold mt-4 hover:bg-zinc-200 w-full rounded relative z-10 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]">Create Promo</button>
            </div>
          </div>

          {userProfile?.role === 'fighter' && (
             <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl mt-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 space-y-8">
                   <div className="flex justify-between items-center border-b border-white/5 pb-4">
                     <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                       <ListTodo className="w-5 h-5 text-[#E31837]" />
                       Training Tasks
                     </h2>
                   </div>

                   <form onSubmit={handleAddTrainingTask} className="flex gap-4">
                     <input 
                       value={newTaskTitle} 
                       onChange={e => setNewTaskTitle(e.target.value)} 
                       placeholder="Add a new training task (e.g., 5 miles run, Sparring 6 rounds)..." 
                       className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none" 
                     />
                     <button type="submit" disabled={!newTaskTitle.trim()} className="bg-[#E31837] text-white px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-700 transition disabled:opacity-50">
                       Add Task
                     </button>
                   </form>

                   {loadingTasks ? (
                     <div className="flex justify-center p-8">
                       <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
                     </div>
                   ) : trainingTasks.length > 0 ? (
                     <div className="space-y-3">
                       {trainingTasks.map(task => (
                         <div key={task.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${task.completed ? 'bg-zinc-900 border-white/5 opacity-60' : 'bg-black border-white/10 hover:border-white/20'}`}>
                           <div className="flex items-center gap-4">
                             <button onClick={() => handleToggleTask(task.id, task.completed)} className="focus:outline-none transition-transform hover:scale-110">
                               {task.completed ? (
                                 <CheckCircle2 className="w-6 h-6 text-[#E31837]" />
                               ) : (
                                 <Circle className="w-6 h-6 text-zinc-600 hover:text-zinc-400" />
                               )}
                             </button>
                             <span className={`text-sm font-semibold uppercase tracking-tight ${task.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                               {task.title}
                             </span>
                           </div>
                           <button onClick={() => handleDeleteTask(task.id)} className="text-zinc-600 hover:text-red-500 transition-colors p-2 rounded">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="bg-black/30 border border-white/5 rounded-2xl p-10 text-center">
                       <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">No tasks active. Time to put in the work.</p>
                     </div>
                   )}
                </div>
             </div>
          )}

          {userProfile?.role === 'fighter' && (
             <div id="video-clips-section" className="bg-zinc-950 border border-white/5 p-8 rounded-3xl mt-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 space-y-8">
                   <div className="flex justify-between items-center border-b border-white/5 pb-4 md:flex-row flex-col gap-4">
                     <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3 w-full md:w-auto">
                       <Video className="w-5 h-5 text-[#E31837]" />
                       Video Clips
                     </h2>
                     <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                       <select 
                         value={videoSortOption}
                         onChange={e => setVideoSortOption(e.target.value)}
                         className="bg-black border border-white/10 rounded px-2 py-1.5 text-[10px] text-zinc-400 uppercase tracking-widest font-bold focus:border-[#E31837] outline-none hover:text-white transition-colors"
                       >
                         <option value="newest">Newest First</option>
                         <option value="oldest">Oldest First</option>
                         <option value="title-asc">Title (A-Z)</option>
                         <option value="title-desc">Title (Z-A)</option>
                       </select>
                       <button 
                         onClick={() => setShowAddVideo(!showAddVideo)}
                         className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded uppercase text-[10px] font-black tracking-widest hover:bg-zinc-200 transition-colors"
                       >
                         {showAddVideo ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Clip</>}
                       </button>
                     </div>
                   </div>

                   {showAddVideo && (
                     <form onSubmit={handleAddVideo} className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Clip Title</label>
                             <input required value={videoData.title} onChange={e => setVideoData({...videoData, title: e.target.value})} placeholder="e.g. Heavy Bag Session, Sparring Highlights" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" />
                           </div>
                           
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Description</label>
                             <textarea value={videoData.description} onChange={e => setVideoData({...videoData, description: e.target.value})} placeholder="Tell viewers about this training session..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none resize-none min-h-[100px]" />
                           </div>
                           
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Upload Video (Max 200MB)</label>
                             <div className="flex items-center gap-4 flex-wrap">
                               <input type="file" ref={videoFileRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />
                               <button type="button" onClick={() => videoFileRef.current?.click()} className="bg-zinc-900 border border-white/10 px-6 py-3 rounded-xl text-xs text-white uppercase font-bold hover:bg-zinc-800 transition-colors">Select Video</button>
                               {videoUploadProgress > 0 && <span className="text-xs text-[#E31837] font-bold">{videoUploadProgress === 100 ? 'Processing...' : `${Math.round(videoUploadProgress)}% Uploading...`}</span>}
                               {videoData.videoUrl && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Ready</span>}
                             </div>
                           </div>

                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Upload Thumbnail (Optional, Max 5MB)</label>
                             <div className="flex items-center gap-4 flex-wrap">
                               <input type="file" ref={thumbnailFileRef} onChange={handleThumbnailUpload} className="hidden" accept="image/*" />
                               <button type="button" onClick={() => thumbnailFileRef.current?.click()} className="bg-zinc-900 border border-white/10 px-6 py-3 rounded-xl text-xs text-white uppercase font-bold hover:bg-zinc-800 transition-colors">Select Thumbnail</button>
                               {thumbnailUploadProgress > 0 && <span className="text-xs text-[#E31837] font-bold">{thumbnailUploadProgress === 100 ? 'Processing...' : `${Math.round(thumbnailUploadProgress)}% Uploading...`}</span>}
                               {videoData.thumbnailUrl && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Ready</span>}
                             </div>
                           </div>
                        </div>
                        <div className="pt-2">
                          <button type="submit" disabled={!videoData.videoUrl || (videoUploadProgress > 0 && videoUploadProgress < 100) || (thumbnailUploadProgress > 0 && thumbnailUploadProgress < 100)} className="w-full bg-[#E31837] text-white font-black uppercase italic tracking-tighter text-sm px-6 py-4 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50">
                            Post to Profile
                          </button>
                        </div>
                     </form>
                   )}

                   {loadingVideos ? (
                     <div className="flex justify-center p-8">
                       <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
                     </div>
                   ) : videoClips.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {[...videoClips].sort((a, b) => {
                         if (videoSortOption === 'newest') return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
                         if (videoSortOption === 'oldest') return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
                         if (videoSortOption === 'title-asc') return (a.title || '').localeCompare(b.title || '');
                         if (videoSortOption === 'title-desc') return (b.title || '').localeCompare(a.title || '');
                         return 0;
                       }).map(clip => (
                          <div key={clip.id} className="group/clip bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 flex flex-col">
                             <div className="relative aspect-video bg-black">
                               {/* @ts-ignore */}
                               <ReactPlayer 
                                 url={clip.videoUrl} 
                                 width="100%"
                                 height="100%"
                                 controls
                                 playsinline
                                 light={clip.thumbnailUrl || true}
                               />
                               <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover/clip:opacity-100 transition-opacity">
                                  <button onClick={() => handleShareVideo(clip)} className="bg-black/60 backdrop-blur-sm p-1.5 rounded text-white hover:text-[#E31837] transition-colors border border-white/10 pointer-events-auto" title="Share Video">
                                     <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleEditVideoStart(clip)} className="bg-black/60 backdrop-blur-sm p-1.5 rounded text-white hover:text-blue-500 transition-colors border border-white/10 pointer-events-auto" title="Edit Video">
                                     <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteVideo(clip.id)} className="bg-black/60 backdrop-blur-sm p-1.5 rounded text-white hover:text-red-500 transition-colors border border-white/10 pointer-events-auto">
                                     <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                               </div>
                             </div>
                             <div className="p-4 flex flex-col gap-1 flex-1">
                               {editingVideoId === clip.id ? (
                                 <form onSubmit={handleUpdateVideo} className="flex flex-col gap-2">
                                   <input 
                                     type="text" 
                                     value={editVideoTitle} 
                                     onChange={(e) => setEditVideoTitle(e.target.value)}
                                     className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E31837]"
                                     placeholder="Video Title"
                                     required
                                   />
                                   <textarea 
                                     value={editVideoDescription} 
                                     onChange={(e) => setEditVideoDescription(e.target.value)}
                                     className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm h-20 resize-none focus:outline-none focus:border-[#E31837]"
                                     placeholder="Description"
                                   ></textarea>
                                   <div className="flex gap-2 justify-end mt-2">
                                     <button type="button" onClick={handleCancelEditVideo} className="px-3 py-1.5 rounded bg-zinc-800 text-xs text-white uppercase font-bold hover:bg-zinc-700 transition">Cancel</button>
                                     <button type="submit" className="px-3 py-1.5 rounded bg-[#E31837] text-xs text-white uppercase font-bold hover:bg-red-700 transition">Save</button>
                                   </div>
                                 </form>
                               ) : (
                                 <>
                                   <h3 className="font-bold text-white text-sm uppercase tracking-tight line-clamp-1">{clip.title}</h3>
                                   {clip.description && (
                                     <p className="text-zinc-400 text-xs line-clamp-2">{clip.description}</p>
                                   )}
                                 </>
                               )}
                             </div>
                          </div>
                       ))}
                     </div>
                   ) : (
                     <div className="bg-black/30 border border-white/5 rounded-2xl p-10 text-center">
                       <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">No performance tape uploaded. Show agents your skills.</p>
                     </div>
                   )}
                </div>
             </div>
          )}

          {userProfile?.role === 'fighter' && (
             <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl mt-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 space-y-8">
                   <div className="flex justify-between items-center border-b border-white/5 pb-4">
                     <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                       <FileText className="w-5 h-5 text-[#E31837]" />
                       Contract Vault
                     </h2>
                     <button 
                       onClick={() => setShowAddContract(!showAddContract)}
                       className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded uppercase text-[10px] font-black tracking-widest hover:bg-zinc-200 transition-colors"
                     >
                       {showAddContract ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Contract</>}
                     </button>
                   </div>

                   {showAddContract && (
                     <form onSubmit={handleAddContract} className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Opponent</label>
                             <input required value={contractData.opponent} onChange={e => setContractData({...contractData, opponent: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Date</label>
                             <input required type="date" value={contractData.date} onChange={e => setContractData({...contractData, date: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none [color-scheme:dark]" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Promotion</label>
                             <input required value={contractData.promotion} onChange={e => setContractData({...contractData, promotion: e.target.value})} placeholder="e.g. UFC, PFL" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Payout / Purse</label>
                             <input required value={contractData.payout} onChange={e => setContractData({...contractData, payout: e.target.value})} placeholder="e.g. $10,000 / $10,000" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Upload Contract (Optional PDF/Image)</label>
                           <div className="flex items-center gap-4">
                             <input type="file" ref={contractFileRef} onChange={handleContractUpload} className="hidden" accept="image/*,.pdf" />
                             <button type="button" onClick={() => contractFileRef.current?.click()} className="bg-zinc-900 border border-white/10 px-6 py-3 rounded-xl text-xs text-white uppercase font-bold hover:bg-zinc-800 transition-colors">Select File</button>
                             {contractUploadProgress > 0 && contractUploadProgress < 100 && <span className="text-xs text-[#E31837] font-bold">{Math.round(contractUploadProgress)}% Uploading...</span>}
                             {contractData.contractUrl && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Uploaded</span>}
                           </div>
                        </div>
                        <div className="pt-2">
                          <button type="submit" disabled={contractUploadProgress > 0 && contractUploadProgress < 100} className="w-full bg-[#E31837] text-white font-black uppercase italic tracking-tighter text-sm px-6 py-4 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50">
                            Save Contract
                          </button>
                        </div>
                     </form>
                   )}

                   {loadingContracts ? (
                     <div className="flex justify-center p-8">
                       <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
                     </div>
                   ) : contracts.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {contracts.map(contract => (
                          <div key={contract.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between group">
                            <div>
                               <div className="flex justify-between items-start mb-4">
                                  <div className="text-xs uppercase font-black tracking-widest text-[#E31837]">{contract.promotion}</div>
                                  <button onClick={() => handleDeleteContract(contract.id)} className="text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                               <h3 className="text-xl font-bold text-white mb-1 leading-none">{contract.opponent}</h3>
                               <div className="text-sm text-zinc-400 flex items-center gap-2 mb-4">
                                  <Calendar className="w-3 h-3" /> {new Date(contract.date + 'T12:00:00').toLocaleDateString()}
                               </div>
                               <div className="bg-zinc-900 border border-white/5 px-3 py-2 rounded-lg text-xs text-white font-mono inline-block">
                                  Payout: {contract.payout}
                               </div>
                            </div>
                            {contract.contractUrl && (
                               <a href={contract.contractUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-zinc-500 hover:text-white transition-colors">
                                 <LinkIcon className="w-3 h-3" /> View Document
                               </a>
                            )}
                          </div>
                       ))}
                     </div>
                   ) : (
                     <div className="bg-black/30 border border-white/5 rounded-2xl p-10 text-center">
                       <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">No contracts stored. Add your fight history to attract sponsors.</p>
                     </div>
                   )}
                </div>
             </div>
          )}

          <div className="bg-[#0c0c0c] border border-[#E31837]/30 p-8 mt-12 rounded-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-3xl font-brand tracking-wider text-zinc-200 drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)] mb-2 flex items-center gap-2"><Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" /> FightNet Pro</h2>
                <p className="text-zinc-400 mb-4 text-sm max-w-lg">Unlimited tape uploads, premium analytics, direct messaging to sponsors, and priority agent review process.</p>
                <div className="text-[#E31837] font-black text-3xl tracking-tighter mb-4">$9.99<span className="text-[10px] text-zinc-500 font-sans uppercase tracking-widest ml-1">/mo</span></div>
                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          successUrl: window.location.href,
                          cancelUrl: window.location.href,
                          customerEmail: currentUser?.email || ''
                        })
                      });
                      const data = await response.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        alert(data.error || 'Checkout failed. Ensure SQUARE_ACCESS_TOKEN is configured.');
                      }
                    } catch (error) {
                      console.error(error);
                      alert('Failed to initiate checkout.');
                    }
                  }}
                  className="bg-white text-black px-6 py-2 font-bold uppercase tracking-tighter text-[11px] rounded hover:bg-zinc-200 transition"
                >
                  Upgrade to Pro
                </button>
              </div>
              <div className="hidden md:block w-32 h-32 rounded-full border border-zinc-800 overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-500">
                 <div className="absolute inset-0 bg-cover bg-center mix-blend-screen" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1599552611410-ded85cb2cb39?w=300&q=80)'}}></div>
                 <div className="absolute inset-0 bg-[#E31837]/20 mix-blend-multiply"></div>
              </div>
            </div>
          </div>

          <PromoGenerator 
            isOpen={showVideoModal} 
            onClose={() => setShowVideoModal(false)} 
            fighterName={userProfile?.displayName || 'The Contender'} 
            initialPrompt={`A cinematic promotional video of ${userProfile?.displayName || 'The Contender'}, an elite MMA fighter. Show them throwing a dynamic combination in a dimly lit, gritty combat arena with neon red accents, slow motion, dramatic hyper-realistic lighting.`}
          />
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
