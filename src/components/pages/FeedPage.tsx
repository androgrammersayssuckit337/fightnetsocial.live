import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  likesCount: number;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
}

export function FeedPage() {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
             return { ...post, authorName: userData.displayName, authorImage: userData.profileImageUrl };
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

  const handleFileUpload = async (file: File) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `posts/${currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    console.log("Starting upload to:", fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        }, 
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          alert(`Upload failed: ${error.message}. Large files (>20MB) are blocked.`);
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
    if (!newPostContent.trim() || !currentUser) return;

    setIsSubmitting(true);
    let mediaUrl = '';
    const file = fileInputRef.current?.files?.[0];

    try {
      if (file) {
        mediaUrl = await handleFileUpload(file);
      }

      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        content: newPostContent,
        createdAt: serverTimestamp(),
        likesCount: 0,
        mediaUrl,
        mediaType: file?.type.startsWith('video') ? 'video' : 'image'
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

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0a0a0a]">
      {/* Feed Section */}
      <section className="flex-1 border-r border-[#222] p-4 md:p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold uppercase italic text-white leading-none">Top Prospect Feed</h2>
          <div className="flex space-x-2">
            <span className="px-2 py-0.5 bg-zinc-800 text-[10px] text-zinc-400 rounded">Recent</span>
            <span className="px-2 py-0.5 bg-[#E31837] text-[10px] text-white rounded">Trending</span>
          </div>
        </div>

        {userProfile?.role === 'fighter' && (
          <form onSubmit={handleCreatePost} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex gap-4">
              <img src={userProfile.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=111&color=fff`} alt="" className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <textarea 
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share your journey, highlight, or call out..."
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none mb-2"
                  rows={2}
                />
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                   <div className="w-full bg-zinc-800 h-1 rounded-full mb-3 overflow-hidden">
                     <div className="bg-[#E31837] h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                   </div>
                )}

                <div className="flex justify-between items-center border-t border-zinc-800 pt-2">
                   <div className="flex items-center gap-4">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase flex items-center transition-colors"
                      >
                        + Attach Media
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*,image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setNewPostContent(prev => prev || `Check out my latest ${e.target.files?.[0].type.includes('video') ? 'tape' : 'shot'}`);
                          }
                        }}
                      />
                   </div>
                   <button 
                    type="submit" 
                    disabled={isSubmitting || (!newPostContent.trim() && !fileInputRef.current?.files?.[0])}
                    className="bg-white text-black px-4 py-1 font-bold uppercase tracking-wider text-[10px] rounded hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                   >
                     {isSubmitting ? 'Posting...' : 'Post'}
                   </button>
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                 <div className="flex items-center gap-3">
                   <img src={post.authorImage || `https://ui-avatars.com/api/?name=${post.authorName}&background=000&color=fff`} className="w-8 h-8 rounded-full border border-zinc-700" alt="" />
                   <div>
                     <h3 className="font-bold text-white text-sm leading-none mb-1">{post.authorName || 'Unknown Fighter'}</h3>
                     <p className="text-[10px] text-zinc-500 font-mono uppercase">{formatDistanceToNow(post.createdAt)} ago</p>
                   </div>
                 </div>
              </div>
               
              <div className="p-4">
                 <p className="text-sm text-zinc-300 font-medium whitespace-pre-wrap">{post.content}</p>
              </div>

               {/* Media Display */}
               {(post.mediaUrl || post.id === 'demo1') && (
                  <div className="relative aspect-video bg-black flex items-center justify-center border-y border-zinc-800">
                    <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: post.mediaUrl ? `url(${post.mediaUrl})` : 'url(https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80)' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    
                    {post.mediaType === 'video' || post.id === 'demo1' ? (
                      <div className="w-12 h-12 rounded-full bg-[#E31837]/80 flex items-center justify-center border border-white/20 z-10 cursor-pointer hover:scale-105 transition-transform"
                           onClick={() => post.mediaUrl && window.open(post.mediaUrl, '_blank')}>
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                      </div>
                    ) : (
                      <img src={post.mediaUrl} className="max-h-full object-contain relative z-10" alt="Post content" />
                    )}
                  </div>
               )}

              <div className="px-4 py-3 bg-zinc-900/50 flex items-center text-xs text-zinc-500 space-x-4">
                 <button className="hover:text-white transition-colors">{post.likesCount} Likes</button>
                 <button className="hover:text-white transition-colors">Comment</button>
                 <span className="text-[#E31837] font-bold uppercase ml-auto">Share</span>
              </div>
            </div>
          ))}

          {posts.length === 0 && (
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
              <p className="text-sm text-zinc-500 uppercase font-bold tracking-widest mb-1">No Posts Found</p>
              <p className="text-xs text-zinc-600">Be the first to upload a highlight.</p>
            </div>
          )}
        </div>

        {/* Quick News Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pb-4">
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Official Notice</p>
            <p className="text-sm font-bold mt-1 text-white">Bellator Open Tryouts in Austin, TX - Aug 24</p>
          </div>
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
            <p className="text-[10px] text-[#E31837] uppercase font-bold tracking-widest">Fighter Move</p>
            <p className="text-sm font-bold mt-1 text-white">Marcus 'Apex' Chen signs with Agent X Pro</p>
          </div>
        </div>
      </section>

      {/* Side Stats/Status - Hidden on very small screens, visible on md and up */}
      <aside className="w-80 flex-col p-6 space-y-6 bg-[#0c0c0c] hidden lg:flex shrink-0 overflow-y-auto">
        {userProfile && (
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
             <div className="flex items-center gap-4 mb-4">
                <img 
                  src={userProfile.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=000&color=fff`} 
                  className="w-12 h-12 rounded-full border-2 border-zinc-700 object-cover" 
                  alt="" 
                />
                <div className="overflow-hidden">
                   <h3 className="text-sm font-black uppercase text-white truncate">{userProfile.displayName}</h3>
                   <p className="text-[10px] text-zinc-500 uppercase font-mono">{userProfile.role}</p>
                </div>
             </div>
             <Link to="/app/career" className="block w-full py-2 bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest text-center rounded hover:bg-zinc-700 transition">
               Edit Fighter Profile
             </Link>
          </div>
        )}

        <div>
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-4">My Career Path</h3>
          <div className="space-y-4">
            <div className="relative pb-4">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-white">AMATEUR</span>
                <span className="text-[10px] text-zinc-500">4-0-0 Record</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-[#E31837]"></div>
              </div>
            </div>
            <div className="relative pb-4">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-white">SEMI-PRO</span>
                <span className="text-[10px] text-[#E31837] font-bold">ACTIVE</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="w-[40%] h-full bg-[#E31837]"></div>
              </div>
            </div>
            <div className="relative opacity-30">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-white">UFC / BELLATOR</span>
                <span className="text-[10px] text-zinc-500 italic">LOCKED</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#222] pt-6">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-4">Fight Schedule</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 hover:bg-zinc-900 rounded transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-white">UFC 305: Pantoja vs Erceg</p>
                <p className="text-[10px] text-zinc-500 italic">Perth, Australia</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">05.04</span>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-zinc-900 rounded transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-white">PFL 4: Regular Season</p>
                <p className="text-[10px] text-zinc-500 italic">Uncasville, CT</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">06.13</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="p-4 bg-gradient-to-br from-[#1a1a1a] to-black rounded-lg border border-[#E31837]/30">
            <p className="text-[10px] font-black text-[#E31837] uppercase tracking-widest">Sponsorship Inquiry</p>
            <h4 className="text-sm font-bold mt-1 text-white">Agent: Sarah Jenkins</h4>
            <p className="text-[11px] text-zinc-400 mt-1">Recruiting heavyweights for the Pro Circuit. Inquire with stats.</p>
            <button className="mt-3 text-[10px] font-bold uppercase underline decoration-[#E31837] text-white underline-offset-4 hover:text-[#E31837] transition">Apply for Advocacy</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
