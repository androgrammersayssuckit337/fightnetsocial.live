import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Award, Target, ExternalLink, Calendar, MapPin, Edit2, UserPlus, FileText, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../../utils/error';

export function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [videoClips, setVideoClips] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    
    const fetchProfileState = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setProfileData(null);
        }

        // Fetch user connections
        const userConnectionsQuery = query(
           collection(db, 'connections'),
           where('users', 'array-contains', userId),
           where('status', '==', 'accepted')
        );
        const userConns = await getDocs(userConnectionsQuery);
        
        const friendsList = await Promise.all(userConns.docs.map(async (d) => {
           const otherId = d.data().users.find((u: string) => u !== userId);
           if (!otherId) return null;
           const uDoc = await getDoc(doc(db, 'users', otherId));
           return { id: otherId, ...uDoc.data() };
        }));
        setConnections(friendsList.filter(Boolean));

        // Only fetch my connection status if it's not our own profile and we're logged in
        if (currentUser && currentUser.uid !== userId) {
           const connectionQuery = query(
             collection(db, 'connections'),
             where('users', 'array-contains', currentUser.uid)
           );
           const connSnap = await getDocs(connectionQuery);
           const conn = connSnap.docs.find(d => d.data().users.includes(userId));
           if (conn) {
             setConnectionStatus(conn.data().status);
             setConnectionId(conn.id);
           }
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileState();
  }, [userId, currentUser]);

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
         // handle
      } finally {
        setLoadingPosts(false);
      }
    };

    const fetchUserVideos = async () => {
      try {
        setLoadingVideos(true);
        const q = query(
          collection(db, 'videoClips'),
          where('fighterId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const userVideos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVideoClips(userVideos);
      } catch (err) {
         // handle
      } finally {
        setLoadingVideos(false);
      }
    };

    fetchUserPosts();
    fetchUserVideos();
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUser || (!['sponsor', 'agent'].includes(userProfile?.role || '') && currentUser.uid !== userId)) return;
    
    // Only fetch contracts if we are a sponsor/agent or looking at our own profile
    const fetchContracts = async () => {
      try {
        setLoadingContracts(true);
        const q = query(
          collection(db, 'contracts'),
          where('fighterId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        setContracts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Failed to load contracts", err);
      } finally {
        setLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [userId, currentUser, userProfile?.role]);

  const handleConnect = async () => {
     if (!currentUser || !userId) return;
     try {
        const docId = [currentUser.uid, userId].sort().join('_');
        await setDoc(doc(db, 'connections', docId), {
           users: [currentUser.uid, userId],
           status: 'pending',
           createdAt: serverTimestamp()
        });
        setConnectionStatus('pending');
        setConnectionId(docId);
     } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'connections', auth);
     }
  };

  const handleAccept = async () => {
     if (!connectionId) return;
     try {
        await updateDoc(doc(db, 'connections', connectionId), {
           status: 'accepted'
        });
        setConnectionStatus('accepted');
     } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'connections', auth);
     }
  };

  const handleMessage = async () => {
     if (!currentUser || !userId) return;
     try {
        const chatId = [currentUser.uid, userId].sort().join('_');
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists()) {
           await setDoc(doc(db, 'chats', chatId), {
              users: [currentUser.uid, userId],
              updatedAt: serverTimestamp()
           });
        }
        navigate('/app/messages');
     } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'chats', auth);
     }
  };

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
        
        {isOwnProfile ? (
          <button 
            onClick={() => navigate('/app/career')}
            className="flex items-center gap-3 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-white text-black hover:bg-zinc-200 shadow-xl"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-4">
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
                  alert('Error processing subscription.');
                }
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-[#E31837] text-white hover:bg-red-700 shadow-[0_0_15px_rgba(227,24,55,0.4)]"
            >
              Support Fighter
            </button>
            {connectionStatus === 'accepted' ? (
               <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-zinc-900 text-white border border-green-500/30 text-green-500">
                  <Check className="w-4 h-4" /> Connected
               </button>
            ) : connectionStatus === 'pending' ? (
               <button onClick={handleAccept} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-white text-black hover:bg-zinc-200">
                  <Check className="w-4 h-4" /> Accept request
               </button>
            ) : (
               <button onClick={handleConnect} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-[#E31837] text-white hover:bg-red-700 shadow-xl">
                  <UserPlus className="w-4 h-4" /> Connect
               </button>
            )}
            <button onClick={handleMessage} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all bg-zinc-900 text-white border border-white/10 hover:bg-zinc-800">
                <FileText className="w-4 h-4" /> Message
            </button>
          </div>
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

            <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
               <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 <UserPlus className="w-4 h-4" /> Connections ({connections.length})
               </h4>
               <div className="space-y-3">
                  {connections.slice(0, 5).map(conn => (
                     <div key={conn.id} className="flex items-center gap-3">
                        <img src={conn.profileImageUrl || `https://ui-avatars.com/api/?name=${conn.displayName}&background=0c0c0c&color=fff`} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt="" />
                        <div>
                           <div className="text-xs font-bold uppercase text-white truncate max-w-[120px]">{conn.displayName}</div>
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{conn.role}</div>
                        </div>
                     </div>
                  ))}
                  {connections.length === 0 && (
                     <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">No connections yet</div>
                  )}
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

            <div className="space-y-4 mt-8">
               <h3 className="text-lg font-black uppercase text-white tracking-tight italic flex items-center gap-3 border-b border-white/5 pb-4">
                 <ExternalLink className="w-5 h-5 text-[#E31837]" /> Training Reels & Tape
               </h3>

               {loadingVideos ? (
                 <div className="flex justify-center p-8">
                   <div className="w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
                 </div>
               ) : videoClips.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {videoClips.map(clip => (
                      <div key={clip.id} className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/5">
                         <video 
                           src={clip.videoUrl} 
                           className="w-full h-full object-cover"
                           controls
                         />
                         <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-black text-white uppercase tracking-widest border border-white/10">{clip.title}</span>
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div className="bg-zinc-950 border border-white/5 p-8 rounded-2xl text-center shadow-xl">
                   <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">No performance tape uploaded.</p>
                 </div>
               )}
            </div>

            <div className="space-y-4 mt-8">
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

            {(['sponsor', 'agent'].includes(userProfile?.role || '') || currentUser?.uid === userId) && profileData?.role === 'fighter' && (
              <div className="space-y-4 mt-12 bg-zinc-950 border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="relative z-10 space-y-6">
                    <h3 className="text-xl font-black uppercase text-white tracking-tight italic flex items-center gap-3 border-b border-white/5 pb-4">
                      <FileText className="w-5 h-5 text-[#E31837]" /> Contract Vault
                    </h3>

                    {loadingContracts ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
                      </div>
                    ) : contracts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contracts.map(contract => (
                           <div key={contract.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between group/contract">
                             <div>
                                <div className="flex justify-between items-start mb-4">
                                   <div className="text-xs uppercase font-black tracking-widest text-[#E31837]">{contract.promotion}</div>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1 leading-none">{contract.opponent}</h4>
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
                        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">No contracts stored by this fighter.</p>
                      </div>
                    )}
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
