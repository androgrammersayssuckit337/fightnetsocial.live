import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Award, Target, ExternalLink, Calendar, MapPin, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export function ProfilePage() {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // If it's the current user, maybe redirect to career page or show this same read-only view with edit button
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setProfileData(null);
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchUserPosts = async () => {
      try {
        setLoadingPosts(true);
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const userPosts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(userPosts);
      } catch (err) {
        console.error("Error fetching user posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchUserPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a] text-zinc-500 uppercase tracking-widest text-sm font-bold">
        Profile Not Found
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === userId;

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 bg-[#0a0a0a] min-h-full scrollbar-hide max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-2 h-12 bg-[#E31837] italic shadow-[0_0_20px_rgba(227,24,55,0.4)]"></div>
           <div>
             <h1 className="text-3xl font-black uppercase text-white tracking-tighter italic leading-none mb-2">Combat Profile</h1>
             <p className="text-zinc-500 uppercase tracking-[0.2em] text-[10px] font-black">Identity & Analytics</p>
           </div>
        </div>
        
        {isOwnProfile && (
          <button 
            onClick={() => navigate('/app/career')}
            className="flex items-center gap-3 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-white text-black hover:bg-zinc-200 shadow-xl"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 space-y-8">
            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-b from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative mb-6">
                 <div className="absolute -inset-1 bg-gradient-to-r from-[#E31837] to-red-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                 <img 
                  src={profileData.profileImageUrl || `https://ui-avatars.com/api/?name=${profileData.displayName}&background=0c0c0c&color=fff`} 
                  className="relative w-40 h-40 rounded-full border-4 border-black object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105" 
                  alt={profileData.displayName}
                 />
                 <div className="absolute -bottom-2 -right-2 bg-[#E31837] text-white p-2 rounded-full border-4 border-[#0a0a0a] z-10">
                    <Award className="w-5 h-5" />
                 </div>
               </div>
               <h3 className="text-2xl font-black uppercase italic text-white mb-2 relative z-10">{profileData.displayName || 'Unnamed Combatant'}</h3>
               <div className="flex flex-wrap justify-center gap-2 mt-2 relative z-10">
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#E31837] bg-red-900/20 px-3 py-1.5 rounded-md border border-red-900/50">ROLE: {profileData.role}</div>
               </div>
            </div>

            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
               <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4">Vital Statistics</h4>
               
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Target className="w-4 h-4 text-[#E31837]" /> Record</span>
                     <span className="text-sm font-black text-white">{profileData.record || '0-0-0'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-4 h-4 text-[#E31837]" /> Home Gym</span>
                     <span className="text-sm font-bold text-white text-right max-w-[150px] truncate">{profileData.gym || 'Unlisted'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
                     <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4 text-[#E31837]" /> Joined</span>
                     <span className="text-sm font-bold text-white">
                        {profileData.createdAt?.seconds 
                          ? new Date(profileData.createdAt.seconds * 1000).getFullYear() 
                          : new Date().getFullYear()}
                     </span>
                  </div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative z-10 space-y-4">
                  <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                    Combat Bio
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                     {profileData.bio || 'No bio provided.'}
                  </p>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-lg font-black uppercase text-white tracking-tight italic flex items-center gap-3 border-b border-white/5 pb-4">
                 <ExternalLink className="w-5 h-5 text-[#E31837]" /> Media Reel
               </h3>

               {loadingPosts ? (
                 <div className="flex justify-center p-8">
                   <div className="w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
                 </div>
               ) : posts.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {posts.map(post => (
                     <div key={post.id} className="bg-zinc-950 border border-white/5 p-4 rounded-2xl flex flex-col gap-4">
                       {post.imageUrl && (
                         <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5">
                           <img src={post.imageUrl} alt="Combat tape" className="w-full h-full object-cover" />
                         </div>
                       )}
                       <div>
                         <p className="text-sm text-white line-clamp-2 mb-2">{post.content}</p>
                         <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                           {post.createdAt?.seconds ? formatDistanceToNow(post.createdAt.seconds * 1000, { addSuffix: true }) : 'Recently'}
                         </p>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-zinc-950 border border-white/5 p-8 rounded-2xl text-center shadow-xl">
                   <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">No intelligence gathered yet.</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
