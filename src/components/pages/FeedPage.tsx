import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  serverTimestamp, 
  updateDoc, 
  increment as firestoreIncrement,
  deleteField,
  where,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { uploadToS3 } from '../../utils/s3Client';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Share2, Play, Trophy, MapPin, ExternalLink, Camera, Shield, X, Swords, Zap, Filter, Send, Video, BadgeCheck, Image, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import _ReactPlayer from 'react-player';
import { VideoRecorder } from '../VideoRecorder';
import { CameraCapture } from '../CameraCapture';
import { base44 } from '../../services/base44';
const ReactPlayer = _ReactPlayer as any;

interface Post {
  id: string;
  authorId: string;
  content: string;
  category?: 'highlight' | 'result' | 'matchup' | 'general';
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  likesCount: number;
  likedBy?: string[];
  commentsCount?: number;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  authorRole?: string;
  authorRecord?: string;
  authorGym?: string;
  authorVerified?: boolean;
  authorBadges?: string[];
  reactions?: Record<string, string>;
}

interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  authorVerified?: boolean;
}

const EMOJI_OPTIONS = ['🔥', '🥊', '💯', '💪', '🧊'];

export function FeedPage() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  useEffect(() => {
    if (location.state?.prefillPost) {
      setNewPostContent(location.state.prefillPost);
      // Clear state so it doesn't prefill again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [openReactionPostId, setOpenReactionPostId] = useState<string | null>(null);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch following
  useEffect(() => {
    if (!currentUser) return;
    const fetchFollowing = async () => {
      try {
        const q = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
        const userFollows = await getDocs(q);
        const ids = userFollows.docs.map(d => d.data().followingId);
        setFollowingIds(ids);
      } catch (err: any) {
        console.error("Failed to fetch follows", err);
        if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'follows', auth);
        }
      }
    };
    fetchFollowing();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        } as Post;
      });
      
      const hydratedPosts = await Promise.all(postsData.map(async (post) => {
         try {
           const userDoc = await getDoc(doc(db, 'users', post.authorId));
           if (userDoc.exists()) {
             const userData = userDoc.data();
             return { 
               ...post, 
               authorName: userData.displayName, 
               authorImage: userData.profileImageUrl,
               authorRole: userData.role,
               authorRecord: userData.record,
               authorGym: userData.gym,
               authorVerified: userData.verified,
               authorBadges: userData.badges
             };
           }
         } catch(e) { console.error('Failed to fetch author', e) }
         return post;
      }));

      setPosts(hydratedPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts', auth);
    });

    return unsubscribe;
  }, [currentUser]);

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
      default: return 'application/octet-stream';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!currentUser) return '';
    
    let fileExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    if (!fileExt) {
      if (file.type.startsWith('image/')) fileExt = file.type.replace('image/', '');
      else if (file.type.startsWith('video/')) fileExt = file.type.replace('video/', '');
      else fileExt = 'jpg';
      
      if (fileExt === 'jpeg') fileExt = 'jpg';
      if (fileExt === 'quicktime') fileExt = 'mov';
      if (fileExt === 'x-msvideo') fileExt = 'avi';
    }
    
    let mimeType = getMimeType(file);
    if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
        mimeType = fileExt && ['mp4','mov','avi','mkv','webm','wmv'].includes(fileExt) ? 'video/mp4' : 'image/jpeg';
    }
    
    const fileName = `posts/${currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    const metadata = { contentType: mimeType };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          setUploadProgress(0);
          alert(`Upload failed: ${error.message}`);
          reject(error);
        }, 
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            setUploadProgress(0);
            reject(err);
          }
        }
      );
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !selectedFile) || !currentUser) return;

    const file = selectedFile;
    if (file && file.size > 200 * 1024 * 1024) {
      alert("Performance tape too heavy. Max 200MB.");
      return;
    }

    setIsSubmitting(true);
    let mediaUrl = '';

    try {
      if (file) {
        mediaUrl = await handleFileUpload(file);
      }

      const detectedMimeType = file ? getMimeType(file) : '';
      const isVideo = file ? Boolean(detectedMimeType.startsWith('video') || file.name.toLowerCase().match(/\.(mp4|mov|wmv|avi|mkv|webm)$/)) : false;

      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        content: newPostContent.trim(),
        category: 'general',
        createdAt: serverTimestamp(),
        likesCount: 0,
        likedBy: [],
        commentsCount: 0,
        reactions: {},
        mediaUrl,
        mediaType: isVideo ? 'video' : (file ? 'image' : '')
      });

      // Log activity via Base44 API
      base44.telemetry.log('post_created', currentUser.uid, {
        category: 'general',
        hasMedia: Boolean(file),
        mediaType: isVideo ? 'video' : (file ? 'image' : 'none')
      });
      
      setNewPostContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      setUploadProgress(0);
    } catch (error) {
      setUploadProgress(0);
      handleFirestoreError(error, OperationType.CREATE, 'posts', auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async (postId: string) => {
    const postUrl = `${window.location.origin}/app/feed/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FightNet Post',
          text: 'Check out this post on FightNet!',
          url: postUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Copy to clipboard failed', error);
        alert('Failed to copy link.');
      }
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const commentsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let authorName = 'Unknown User';
        let authorImage = '';
        let authorVerified = false;
        if (data.authorId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', data.authorId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              authorName = userData.displayName || 'Unknown User';
              authorImage = userData.profileImageUrl || '';
              authorVerified = userData.verified || false;
            }
          } catch (e) {
            console.error('Failed to fetch user for comment:', e);
          }
        }
        return {
          id: docSnap.id,
          ...data,
          authorName,
          authorImage,
          authorVerified,
        } as Comment;
      }));
      setComments(prev => ({ ...prev, [postId]: commentsData }));
    } catch (error) {
       console.error("Failed to fetch comments", error);
    }
  };

  const handleToggleComments = (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
    } else {
      setOpenCommentsPostId(postId);
      fetchComments(postId);
    }
  };

  const handleCreateComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser) return;
    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: currentUser.uid,
        text: newCommentText.trim(),
        createdAt: serverTimestamp()
      });
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: firestoreIncrement(1)
      });
      setNewCommentText('');
      fetchComments(postId);
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
       setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!currentUser) return;
    try {
      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      const docSnap = await getDoc(commentRef);
      if (!docSnap.exists() || docSnap.data().authorId !== currentUser.uid) return;
      
      await deleteDoc(commentRef);
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: firestoreIncrement(-1)
      });
      fetchComments(postId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      const isLiked = post.likedBy?.includes(currentUser.uid);
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: firestoreIncrement(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });

      if (!isLiked && post.authorId !== currentUser.uid) {
        await addDoc(collection(db, 'users', post.authorId, 'notifications'), {
          type: 'like',
          fromUserId: currentUser.uid,
          fromUserName: userProfile?.displayName || 'Someone',
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (error) {
      console.error("Like failed:", error);
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const post = posts.find(p => p.id === postId);
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        [`reactions.${currentUser.uid}`]: emoji
      });
      setOpenReactionPostId(null);

      if (post && post.authorId !== currentUser.uid && post.reactions?.[currentUser.uid] !== emoji) {
        await addDoc(collection(db, 'users', post.authorId, 'notifications'), {
          type: 'like',
          fromUserId: currentUser.uid,
          fromUserName: userProfile?.displayName || 'Someone',
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (error) {
      console.error("Reaction failed:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'posts', auth);
    }
  };

  const handleRemoveReaction = async (postId: string) => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        [`reactions.${currentUser.uid}`]: deleteField()
      });
    } catch (error) {
       console.error("Reaction remove failed:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-transparent">
      {/* Feed Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-center justify-between mb-2 group cursor-default">
          <div className="flex items-center gap-3">
             <motion.div 
               animate={{ height: [32, 40, 32] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="w-1.5 bg-[#E31837] italic shadow-[0_0_15px_rgba(227,24,55,0.8)] rounded-full"
             ></motion.div>
             <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter group-hover:tracking-wider transition-all duration-500 hidden md:block">Global Feed</h2>
          </div>
          <motion.div 
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="w-10 h-10 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            <Shield className="w-5 h-5 text-white" />
          </motion.div>
        </div>

        <form onSubmit={handleCreatePost} className="bg-zinc-950 border border-white/10 rounded-xl p-6 shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex gap-5 relative z-10">
              <img src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile?.displayName || 'User'}&background=111&color=fff`} alt="" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
              <div className="flex-1">
                <textarea 
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Drop a highlight, training clip, or career news..."
                  className="w-full bg-transparent text-lg font-medium text-white placeholder-zinc-700 underline-offset-8 decoration-[#E31837]/20 focus:outline-none resize-none mb-4 min-h-[100px]"
                />
                
                <AnimatePresence>
                  {showCameraCapture && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <CameraCapture 
                        onCapture={(file) => {
                          setSelectedFile(file);
                          setShowCameraCapture(false);
                        }}
                        onCancel={() => setShowCameraCapture(false)}
                      />
                    </motion.div>
                  )}
                  {showVideoRecorder && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <VideoRecorder 
                        onVideoRecorded={(file) => {
                          setSelectedFile(file);
                          setShowVideoRecorder(false);
                        }}
                        onCancel={() => setShowVideoRecorder(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {uploadProgress > 0 && (
                   <div className="w-full mb-4">
                     <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-[#E31837] mb-2">
                       <span>{uploadProgress === 100 ? 'Processing...' : 'Uploading Media'}</span>
                       <span>{Math.round(uploadProgress)}%</span>
                     </div>
                     <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                       <div className="bg-[#E31837] h-full transition-all duration-300 shadow-[0_0_10px_#E31837]" style={{ width: `${uploadProgress}%` }}></div>
                     </div>
                   </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-white/5 pt-4">
                   <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      {/* Photo upload button */}
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all"
                      >
                        <Image className="w-4 h-4 text-emerald-400" />
                        <span>Photo</span>
                      </button>

                      {/* Video upload button */}
                      <button 
                        type="button" 
                        onClick={() => videoInputRef.current?.click()}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all"
                      >
                        <Film className="w-4 h-4 text-purple-400" />
                        <span>Video</span>
                      </button>

                      {/* Live camera snap button */}
                      <button 
                        type="button" 
                        onClick={() => { setShowCameraCapture(!showCameraCapture); setShowVideoRecorder(false); }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${showCameraCapture ? 'bg-[#E31837] text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Snap</span>
                      </button>

                      {/* Record clip button */}
                      <button
                        type="button"
                        onClick={() => { setShowVideoRecorder(!showVideoRecorder); setShowCameraCapture(false); }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${showVideoRecorder ? 'bg-[#E31837] text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                      >
                        <Video className="w-4 h-4 text-red-500" />
                        <span>Record</span>
                      </button>

                      {/* Hidden image input */}
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />

                      {/* Hidden video input */}
                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        className="hidden" 
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />

                      {/* General file input fallback */}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*,image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />

                      {selectedFile && (
                        <div className="relative inline-block">
                           {selectedFile.type.startsWith('video') ? (
                             <div className="relative w-16 h-16 bg-black rounded-lg overflow-hidden border border-white/20 flex items-center justify-center">
                               <Play className="w-5 h-5 text-white absolute z-10" />
                               <video src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover opacity-60" />
                             </div>
                           ) : (
                             <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-white/20" />
                           )}
                           <button 
                             type="button" 
                             onClick={(e) => { 
                               e.preventDefault(); 
                               setSelectedFile(null); 
                               if(fileInputRef.current) fileInputRef.current.value = '';
                               if(imageInputRef.current) imageInputRef.current.value = '';
                               if(videoInputRef.current) videoInputRef.current.value = '';
                             }}
                             className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-500"
                           >
                             <X className="w-3 h-3" />
                           </button>
                        </div>
                      )}
                   </div>
                   <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    disabled={isSubmitting || (!newPostContent.trim() && !selectedFile)}
                    className="flex items-center gap-2 bg-white text-black px-6 py-2 text-sm font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-xl font-sans shrink-0 self-end sm:self-auto"
                   >
                     {isSubmitting ? 'Posting...' : 'Share Post'}
                   </motion.button>
                </div>
              </div>
            </div>
          </form>

        <div className="space-y-12 mt-8">
          <AnimatePresence>
          {posts
             .map(post => (
            <motion.div 
              key={post.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="group relative bg-transparent"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                   <Link to={`/app/profile/${post.authorId}`} className="relative group/avatar block">
                      <motion.img 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        src={post.authorImage || `https://ui-avatars.com/api/?name=${post.authorName}&background=000&color=fff`} 
                        className="w-12 h-12 rounded-full border-2 border-white/5 object-cover relative z-10" 
                        alt="" 
                      />
                      <div className="absolute inset-0 rounded-full bg-[#E31837] blur-md opacity-0 group-hover/avatar:opacity-40 transition-opacity"></div>
                      {post.authorRole === 'fighter' && (
                        <div className="absolute -bottom-1 -right-1 bg-[#E31837] text-white p-0.5 rounded-full border-2 border-black z-20">
                          <Trophy className="w-3 h-3" />
                        </div>
                      )}
                   </Link>
                   <div>
                     <div className="flex items-center gap-2">
                        <Link to={`/app/profile/${post.authorId}`} className="font-black text-white text-base tracking-tight uppercase italic hover:text-[#E31837] transition-colors">{post.authorName}</Link>
                        {post.authorVerified && (
                          <BadgeCheck className="w-4 h-4 text-[#E31837]" />
                        )}
                        {post.authorRole === 'fighter' && post.authorRecord && (
                          <span className="text-[10px] bg-red-900/20 text-[#E31837] px-1.5 py-0.5 font-black rounded uppercase">{post.authorRecord}</span>
                        )}
                     </div>
                     <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{formatDistanceToNow(post.createdAt)} ago</span>
                        {post.authorGym && (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-700 font-bold uppercase">
                            <MapPin className="w-2.5 h-2.5" />
                            {post.authorGym}
                          </span>
                        )}
                     </div>
                     {post.authorBadges && post.authorBadges.length > 0 && (
                       <div className="flex items-center gap-1.5 mt-1">
                         {post.authorBadges.map((badge, idx) => (
                           <div key={idx} className="flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                             <Trophy className="w-2.5 h-2.5" />
                             {badge}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
                 <button onClick={() => handleShare(post.id)} className="text-zinc-800 hover:text-white transition-colors">
                   <Share2 className="w-4 h-4" />
                 </button>
              </div>
               
              <div className="mb-6">
                 <p className="text-zinc-200 text-lg md:text-xl font-medium leading-relaxed tracking-tight whitespace-pre-wrap">{post.content}</p>
              </div>

               {/* Media Display */}
               {post.mediaUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-zinc-950 group-hover:border-[#E31837]/30 transition-colors shadow-2xl">
                    {post.mediaType === 'video' ? (
                      <div className="relative aspect-video flex items-center justify-center bg-black overflow-hidden rounded-xl">
                        {/* @ts-ignore */}
                        <ReactPlayer
                          url={post.mediaUrl}
                          width="100%"
                          height="100%"
                          controls
                          playsinline
                          pip
                          // @ts-ignore
                          config={{
                            file: {
                              attributes: {
                                controlsList: 'nodownload'
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="relative group/img">
                        <img src={post.mediaUrl} className="w-full max-h-[600px] object-cover" alt="Post content" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-6">
                           <button 
                            onClick={() => window.open(post.mediaUrl, '_blank')}
                            className="text-white text-xs font-bold uppercase underline underline-offset-4 decoration-[#E31837]"
                           >
                             View Full Intensity
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
               )}

              <div className="mt-6 flex flex-col gap-4 border-t border-white/5 pt-6">
                 {/* Reactions Display */}
                 {post.reactions && Object.keys(post.reactions).length > 0 && (
                   <div className="flex flex-wrap gap-2">
                     {Object.entries(
                       (Object.values(post.reactions) as string[]).reduce((acc: Record<string, number>, emoji: string) => {
                         if (emoji) acc[emoji] = (acc[emoji] || 0) + 1;
                         return acc;
                       }, {} as Record<string, number>)
                     ).map(([emoji, count]) => (
                       <div key={emoji} className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 rounded-full px-3 py-1">
                         <span className="text-sm">{emoji}</span>
                         <span className="text-xs text-white font-bold">{count}</span>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="flex items-center gap-8 relative">
                   {/* React Button & Popover */}
                   <div>
                      {openReactionPostId === post.id && (
                        <div className="absolute bottom-full mb-2 -left-2 bg-zinc-900 border border-white/10 p-2 rounded-full flex gap-1 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                           {EMOJI_OPTIONS.map(emoji => (
                              <button 
                                key={emoji}
                                onClick={() => handleReaction(post.id, emoji)}
                                className={`w-10 h-10 flex items-center justify-center text-xl hover:scale-125 hover:bg-white/10 rounded-full transition-all ${post.reactions?.[currentUser?.uid || ''] === emoji ? 'bg-white/20' : ''}`}
                              >
                                {emoji}
                              </button>
                           ))}
                           {post.reactions?.[currentUser?.uid || ''] && (
                              <button 
                                onClick={() => handleRemoveReaction(post.id)}
                                className="w-10 h-10 flex items-center justify-center text-xs text-zinc-500 font-bold uppercase hover:bg-white/10 rounded-full transition-all ml-1 border-l border-white/10"
                              >
                                X
                              </button>
                           )}
                        </div>
                      )}
                      
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setOpenReactionPostId(post.id === openReactionPostId ? null : post.id)}
                        className={`flex items-center gap-2.5 transition-all group/stat relative ${post.reactions?.[currentUser?.uid || ''] ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                      >
                         <span className="text-xl leading-none transition-transform">
                            {post.reactions?.[currentUser?.uid || ''] ? post.reactions[currentUser?.uid || ''] : '🤍'}
                         </span>
                         <span className="text-xs font-black tracking-tighter uppercase ml-1">React</span>
                      </motion.button>
                   </div>

                   <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2.5 transition-all group/stat relative ${post.likedBy?.includes(currentUser?.uid || '') ? 'text-[#E31837]' : 'text-zinc-500 hover:text-[#E31837]'}`}
                   >
                     <Heart className={`w-5 h-5 ${post.likedBy?.includes(currentUser?.uid || '') ? 'fill-[#E31837]' : ''} transition-transform`} />
                     <span className="text-xs font-black tracking-tighter">{post.likesCount || ''} {post.likesCount === 1 ? 'Like' : 'Likes'}</span>
                   </motion.button>
                   <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleComments(post.id)} 
                    className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-all group/stat relative"
                   >
                     <MessageSquare className="w-5 h-5 transition-transform" />
                     <span className="text-xs font-black tracking-tighter">{post.commentsCount || ''} {post.commentsCount === 1 ? 'Comment' : 'Comments'}</span>
                   </motion.button>
                   <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleShare(post.id)} 
                    className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-all group/stat relative"
                   >
                     <Share2 className="w-5 h-5 transition-transform" />
                     <span className="text-xs font-black tracking-tighter uppercase tracking-widest text-[10px] ml-1">Send</span>
                   </motion.button>
                 </div>
              </div>

              {openCommentsPostId === post.id && (
                <div className="border-t border-white/5 p-6 bg-zinc-950/50">
                  <form onSubmit={(e) => handleCreateComment(e, post.id)} className="flex items-center gap-3 mb-6">
                    <img src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile?.displayName || 'User'}&background=111&color=fff`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                    <input 
                      type="text" 
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add a comment..." 
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                      disabled={isSubmittingComment}
                    />
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit" 
                      disabled={!newCommentText.trim() || isSubmittingComment}
                      className="text-[#E31837] font-black uppercase text-xs tracking-wider disabled:opacity-50 flex items-center gap-1"
                    >
                      <span>POST</span>
                      <Send className="w-3 h-3" />
                    </motion.button>
                  </form>

                  <div className="space-y-4">
                    {(comments[post.id] || []).map((comment) => (
                      <div key={comment.id} className="flex gap-3 relative group">
                        <Link to={`/app/profile/${comment.authorId}`}>
                          <img src={comment.authorImage || `https://ui-avatars.com/api/?name=${comment.authorName}&background=0c0c0c&color=fff`} className="w-8 h-8 rounded-full border border-zinc-800 object-cover mt-1" alt="" />
                        </Link>
                        <div className="flex-1">
                          <div className="bg-zinc-900/50 rounded-2xl rounded-tl-sm px-4 py-2 inline-block max-w-full border border-white/5">
                            <Link to={`/app/profile/${comment.authorId}`} className="font-bold text-xs text-white hover:underline mr-2 flex items-center gap-1">
                              {comment.authorName}
                              {comment.authorVerified && <BadgeCheck className="w-3 h-3 text-[#E31837]" />}
                            </Link>
                            <p className="text-sm text-zinc-300 break-words whitespace-pre-wrap">{comment.text}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-2">
                            <p className="text-[10px] text-zinc-600">
                              {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true }) : 'Just now'}
                            </p>
                            {currentUser?.uid === comment.authorId && (
                              <button 
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                className="text-[10px] text-zinc-500 hover:text-[#E31837] font-bold transition-colors uppercase"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {comments[post.id]?.length === 0 && (
                      <p className="text-center text-zinc-600 text-xs py-4">No comments yet. Be the first.</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {posts.length === 0 && (
            <div className="p-12 bg-zinc-950 border border-dashed border-white/10 rounded-2xl text-center">
              <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-lg font-black italic uppercase text-white tracking-tighter mb-1">Silence in the Cage.</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Be the first to leave a mark on the feed.</p>
            </div>
          )}
          </AnimatePresence>
        </div>

        {/* Quick News Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16 pb-8">
          <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Official Notice</p>
            <p className="text-sm font-black italic mt-2 text-white uppercase tracking-tight">Bellator Open Tryouts in Austin, TX - Aug 24</p>
          </div>
          <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-[#E31837] uppercase font-black tracking-widest">Fighter Move</p>
            <p className="text-sm font-black italic mt-2 text-white uppercase tracking-tight">Marcus 'Apex' Chen signs with Agent X Pro</p>
          </div>
        </div>
        </div>
        </motion.section>
    </div>
  );
}
