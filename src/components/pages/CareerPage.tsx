import React, { useState, useRef } from 'react';
import { Target, Award, Zap, Edit2, Save, X, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';

export function CareerPage() {
  const { userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    gym: userProfile?.gym || '',
    record: userProfile?.record || '',
    profileImageUrl: userProfile?.profileImageUrl || '',
  });

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
    
    console.log("uploading to:", fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        console.log(`Upload progress: ${progress}%`);
      }, 
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        setIsUploading(false);
        alert(`Upload failed: ${error.message}. Check storage rules.`);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at:", downloadURL);
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
      window.location.reload(); 
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#0a0a0a] min-h-full">
      <header className="mb-8 border-b border-[#222] pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Career Bridge</h1>
          <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Amateur {'->'} Semi-Pro {'->'} Pro Leagues</p>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
        >
          {isEditing ? <><X className="w-4 h-4" /> Cancel</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}
        </button>
      </header>

      {isEditing ? (
        <form onSubmit={handleUpdateProfile} className="bg-zinc-900 border border-[#E31837]/30 p-6 rounded-lg space-y-6 max-w-xl">
           <h2 className="text-lg font-black uppercase italic text-white mb-4">Edit Your Fighter Profile</h2>
           
           <div className="flex items-center gap-6 mb-6">
             <div className="relative group">
               <img 
                src={formData.profileImageUrl || `https://ui-avatars.com/api/?name=${formData.displayName}&background=0c0c0c&color=fff`} 
                className="w-24 h-24 rounded-full border-2 border-zinc-700 object-cover" 
                alt="Profile"
               />
               <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 {isUploading ? (
                   <Loader2 className="w-6 h-6 animate-spin text-white" />
                 ) : (
                   <Camera className="w-6 h-6 text-white" />
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
             <div>
               <p className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-1">Combat Identity</p>
               <p className="text-white text-sm">Upload a professional headshot or gym photo.</p>
               {uploadProgress > 0 && uploadProgress < 100 && (
                 <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
                   <div className="bg-[#E31837] h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                 </div>
               )}
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-[10px] text-zinc-500 font-bold uppercase">Display Name</label>
               <input 
                 value={formData.displayName} 
                 onChange={e => setFormData({...formData, displayName: e.target.value})}
                 className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-[#E31837]"
               />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] text-zinc-500 font-bold uppercase">Record (e.g. 4-0-0)</label>
               <input 
                 value={formData.record} 
                 onChange={e => setFormData({...formData, record: e.target.value})}
                 className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-[#E31837]"
               />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] text-zinc-500 font-bold uppercase">Home Gym</label>
               <input 
                 value={formData.gym} 
                 onChange={e => setFormData({...formData, gym: e.target.value})}
                 className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-[#E31837]"
               />
             </div>
           </div>
           <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase">Bio / Catchphrase</label>
              <textarea 
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-[#E31837] resize-none"
                rows={3}
              />
           </div>
           <button type="submit" className="bg-[#E31837] text-white font-black uppercase text-[11px] px-8 py-3 rounded hover:bg-red-700 w-full md:w-auto shadow-lg shadow-red-900/20">
              Save Profile Changes
           </button>
        </form>
      ) : (
        <>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <button className="bg-[#E31837] px-6 py-2 uppercase text-[10px] font-bold mt-4 hover:bg-red-700 text-white w-full rounded relative z-10 border border-white/10 shadow-[0_0_15px_rgba(227,24,55,0.2)]">Submit Tape</button>
            </div>
          </div>

          <div className="bg-[#0c0c0c] border border-[#E31837]/30 p-8 mt-12 rounded-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase text-white mb-2 flex items-center gap-2 italic tracking-tighter"><Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" /> FightNet Pro</h2>
                <p className="text-zinc-400 mb-4 text-sm max-w-lg">Unlimited tape uploads, premium analytics, direct messaging to sponsors, and priority agent review process.</p>
                <div className="text-[#E31837] font-black text-3xl tracking-tighter mb-4">$9.99<span className="text-[10px] text-zinc-500 font-sans uppercase tracking-widest ml-1">/mo</span></div>
                <button className="bg-white text-black px-6 py-2 font-bold uppercase tracking-tighter text-[11px] rounded hover:bg-zinc-200 transition">Upgrade to Pro</button>
              </div>
              <div className="hidden md:block w-32 h-32 rounded-full border border-zinc-800 overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-500">
                 <div className="absolute inset-0 bg-cover bg-center mix-blend-screen" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1599552611410-ded85cb2cb39?w=300&q=80)'}}></div>
                 <div className="absolute inset-0 bg-[#E31837]/20 mix-blend-multiply"></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
