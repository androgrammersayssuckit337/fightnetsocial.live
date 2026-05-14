import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
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
  deleteField
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Share2, Play, Trophy, MapPin, ExternalLink, Camera, Shield } from 'lucide-react';
import ReactPlayer from 'react-player';

interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  likesCount: number;
  commentsCount?: number;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  authorRole?: string;
  authorRecord?: string;
  authorGym?: string;
  reactions?: Record<string, string>;
}

interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
}

const EMOJI_OPTIONS = ['🔥', '🥊', '💯', '💪', '🧊'];

export function FeedPage() {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [openReactionPostId, setOpenReactionPostId] = useState<string | null>(null);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
               authorGym: userData.gym
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
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `posts/${currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    console.log("Starting upload to:", fileName);
    const metadata = {
      contentType: getMimeType(file),
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        }, 
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          alert(`Upload failed: ${error.message}. Large files (>200MB) are blocked.`);
          reject(error);
        }, 
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File available at:", downloadURL);
            resolve(downloadURL);
          } catch (err) {
            console.error("Error getting download URL:", err);
            reject(err);
          }
        }
      );
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !fileInputRef.current?.files?.[0]) || !currentUser) return;

    const file = fileInputRef.current?.files?.[0];
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
        createdAt: serverTimestamp(),
        likesCount: 0,
        reactions: {},
        mediaUrl,
        mediaType: isVideo ? 'video' : (file ? 'image' : '')
      });
      
      setNewPostContent('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadProgress(0);
    } catch (error) {
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
        if (data.authorId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', data.authorId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              authorName = userData.displayName || 'Unknown User';
              authorImage = userData.profileImageUrl || '';
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

  const handleLike = async (postId: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: firestoreIncrement(1)
      });
    } catch (error) {
      console.error("Like failed:", error);
    }
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        [`reactions.${currentUser.uid}`]: emoji
      });
      setOpenReactionPostId(null);
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
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0a0a0a]">
      {/* Feed Section */}
      <section className="flex-1 border-r border-white/5 p-4 md:p-8 space-y-8 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-[#E31837] italic shadow-[0_0_15px_rgba(227,24,55,0.5)]"></div>
             <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Pro-Circuit Feed</h2>
          </div>
          <div className="flex space-x-2">
             <div className="px-3 py-1 bg-zinc-900 border border-white/5 text-[10px] font-black uppercase text-zinc-500 rounded-sm">Global</div>
             <div className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase rounded-sm">Hot</div>
          </div>
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

                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                   <div className="flex items-center gap-6">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-500 hover:text-[#E31837] text-[10px] font-black uppercase flex items-center gap-2 transition-all group/btn"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add Tape / Snap</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*,image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const name = e.target.files[0].name;
                            const isVid = e.target.files[0].type.includes('video');
                            setNewPostContent(prev => prev || `Fresh ${isVid ? 'tape' : 'shot'}: ${name}`);
                          }
                        }}
                      />
                   </div>
                   <button 
                    type="submit" 
                    disabled={isSubmitting || (!newPostContent.trim() && !fileInputRef.current?.files?.[0])}
                    className="bg-[#E31837] text-white px-8 py-2.5 font-black uppercase italic tracking-tighter rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-900/20"
                   >
                     {isSubmitting ? 'Locking in...' : 'Publish'}
                   </button>
                </div>
              </div>
            </div>
          </form>
        <div className="space-y-12">
          {posts.map(post => (
            <div key={post.id} className="group relative bg-[#0a0a0a] animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-4">
                   <Link to={`/app/profile/${post.authorId}`} className="relative hover:opacity-80 transition-opacity">
                      <img src={post.authorImage || `https://ui-avatars.com/api/?name=${post.authorName}&background=000&color=fff`} className="w-12 h-12 rounded-full border-2 border-white/5 object-cover" alt="" />
                      {post.authorRole === 'fighter' && (
                        <div className="absolute -bottom-1 -right-1 bg-[#E31837] text-white p-0.5 rounded-full border-2 border-black">
                          <Trophy className="w-3 h-3" />
                        </div>
                      )}
                   </Link>
                   <div>
                     <div className="flex items-center gap-2">
                        <Link to={`/app/profile/${post.authorId}`} className="font-black text-white text-base tracking-tight uppercase italic hover:text-[#E31837] transition-colors">{post.authorName}</Link>
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
                        <ReactPlayer
                          url={post.mediaUrl}
                          width="100%"
                          height="100%"
                          controls
                          playsinline
                          pip
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
                      
                      <button 
                        onClick={() => setOpenReactionPostId(post.id === openReactionPostId ? null : post.id)}
                        className={`flex items-center gap-2.5 transition-all group/stat ${post.reactions?.[currentUser?.uid || ''] ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                      >
                         <span className="text-xl leading-none group-hover/stat:scale-110 transition-transform">
                            {post.reactions?.[currentUser?.uid || ''] ? post.reactions[currentUser?.uid || ''] : '🤍'}
                         </span>
                         <span className="text-xs font-black tracking-tighter uppercase ml-1">React</span>
                      </button>
                   </div>

                   <button 
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-2.5 text-zinc-500 hover:text-[#E31837] transition-all group/stat"
                   >
                     <Heart className={`w-5 h-5 ${post.likesCount > 0 ? 'fill-[#E31837] text-[#E31837]' : ''} group-hover/stat:scale-110 transition-transform`} />
                     <span className="text-xs font-black tracking-tighter">{post.likesCount || ''} {post.likesCount === 1 ? 'Like' : 'Likes'}</span>
                   </button>
                   <button onClick={() => handleToggleComments(post.id)} className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-all group/stat">
                     <MessageSquare className="w-5 h-5 group-hover/stat:scale-110 transition-transform" />
                     <span className="text-xs font-black tracking-tighter">{post.commentsCount || ''} {post.commentsCount === 1 ? 'Comment' : 'Comments'}</span>
                   </button>
                   <button onClick={() => handleShare(post.id)} className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-all group/stat">
                     <Share2 className="w-5 h-5 group-hover/stat:scale-110 transition-transform" />
                     <span className="text-xs font-black tracking-tighter uppercase tracking-widest text-[10px] ml-1">Send</span>
                   </button>
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
                    <button 
                      type="submit" 
                      disabled={!newCommentText.trim() || isSubmittingComment}
                      className="text-[#E31837] font-black uppercase text-xs tracking-wider disabled:opacity-50"
                    >
                      Post
                    </button>
                  </form>

                  <div className="space-y-4">
                    {(comments[post.id] || []).map((comment) => (
                      <div key={comment.id} className="flex gap-3 relative group">
                        <Link to={`/app/profile/${comment.authorId}`}>
                          <img src={comment.authorImage || `https://ui-avatars.com/api/?name=${comment.authorName}&background=0c0c0c&color=fff`} className="w-8 h-8 rounded-full border border-zinc-800 object-cover mt-1" alt="" />
                        </Link>
                        <div className="flex-1">
                          <div className="bg-zinc-900/50 rounded-2xl rounded-tl-sm px-4 py-2 inline-block max-w-full border border-white/5">
                            <Link to={`/app/profile/${comment.authorId}`} className="font-bold text-xs text-white hover:underline mr-2">
                              {comment.authorName}
                            </Link>
                            <p className="text-sm text-zinc-300 break-words whitespace-pre-wrap">{comment.text}</p>
                          </div>
                          <p className="text-[10px] text-zinc-600 mt-1 ml-2">
                            {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true }) : 'Just now'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {comments[post.id]?.length === 0 && (
                      <p className="text-center text-zinc-600 text-xs py-4">No comments yet. Be the first.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {posts.length === 0 && (
            <div className="p-12 bg-zinc-950 border border-dashed border-white/10 rounded-2xl text-center">
              <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-lg font-black italic uppercase text-white tracking-tighter mb-1">Silence in the Cage.</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Be the first to leave a mark on the feed.</p>
            </div>
          )}
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
      </section>

      {/* Side Profile/Navigator - Desktop only */}
      <aside className="w-80 flex-col p-8 space-y-10 bg-[#0c0c0c] hidden lg:flex shrink-0 overflow-y-auto border-l border-white/5 scrollbar-hide">
        {userProfile && (
          <div className="relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-[#E31837] to-red-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
             <div className="relative bg-zinc-900 border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center gap-5 mb-6">
                   <img 
                     src={userProfile.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=000&color=fff`} 
                     className="w-16 h-16 rounded-full border-2 border-[#E31837] object-cover shadow-xl shadow-red-900/20" 
                     alt="" 
                   />
                   <div className="overflow-hidden">
                      <h3 className="text-base font-black uppercase italic text-white truncate leading-tight tracking-tighter">{userProfile.displayName}</h3>
                      <p className="text-[10px] text-[#E31837] font-black uppercase tracking-widest mt-0.5">{userProfile.role}</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Record</p>
                      <p className="text-sm font-black text-white italic">{userProfile.record || '--'}</p>
                   </div>
                   <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xs font-black text-green-500 uppercase">Active</p>
                   </div>
                </div>

                <Link to="/app/career" className="block w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest text-center rounded-xl hover:bg-zinc-200 transition-all shadow-xl">
                  Refine Persona
                </Link>
             </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-6 flex items-center gap-2">
            <span className="w-6 h-px bg-zinc-800"></span>
            Career Mastery
          </h3>
          <div className="space-y-6">
            {[
              { label: 'AMATEUR CIRCUIT', progress: 100, status: 'COMPLETED', color: 'bg-zinc-500' },
              { label: 'SEMI-PRO ROSTER', progress: 45, status: 'IN PROGRESS', color: 'bg-[#E31837]' },
              { label: 'PRO LEGACY', progress: 0, status: 'LOCKED', color: 'bg-zinc-800', locked: true }
            ].map((tier, i) => (
              <div key={i} className={`relative ${tier.locked ? 'opacity-20' : ''}`}>
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-black italic text-white tracking-tighter uppercase">{tier.label}</span>
                    <span className={`text-[9px] font-black ${tier.status === 'COMPLETED' ? 'text-zinc-500' : 'text-[#E31837]'} uppercase tracking-widest`}>{tier.status}</span>
                 </div>
                 <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full ${tier.color} transition-all duration-1000`} style={{ width: `${tier.progress}%` }}></div>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-6 flex items-center gap-2">
             <span className="w-6 h-px bg-zinc-800"></span>
             Combat Map
          </h3>
          <div className="space-y-4">
             {[
               { event: 'UFC 305: Pantoja vs Erceg', loc: 'Perth, Australia', date: '05.04' },
               { event: 'PFL 4: Regular Season', loc: 'Uncasville, CT', date: '06.13' }
             ].map((evt, i) => (
               <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-2xl hover:border-zinc-700 hover:bg-zinc-900/50 transition-all cursor-pointer group/item">
                  <div>
                    <p className="text-xs font-black text-white italic group-hover/item:text-[#E31837] transition-colors">{evt.event}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{evt.loc}</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 group-hover/item:text-white transition-colors">{evt.date}</span>
               </div>
             ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
