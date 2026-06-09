import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Moon, Sun, Upload, Shield, LogOut, ChevronRight, Bot, Zap, MessageCircle, Heart, User, Loader2, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ensureBotsExist, triggerBotPost, triggerBotReactions, triggerBotComments } from '../../services/botService';
import { collection, getDocs, limit, query, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { uploadToS3 } from '../../utils/s3Client';
import { motion } from 'motion/react';

export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // Basic mock states for settings
  const [darkMode, setDarkMode] = useState(true);
  const [mediaUploadsOnMobile, setMediaUploadsOnMobile] = useState(false);
  const [allowLocation, setAllowLocation] = useState(true);
  const [isBotWorking, setIsBotWorking] = useState(false);
  const [isUploadingObj, setIsUploadingObj] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    
    setIsUploadingObj(true);
    try {
      const downloadURL = await uploadToS3(file, 'profiles');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { profileImageUrl: downloadURL });
      alert('Profile image updated successfully!');
      window.location.reload();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingObj(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSeedBots = async () => {
    setIsBotWorking(true);
    try {
      await ensureBotsExist();
      alert('Bots seeded successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to seed bots');
    } finally {
      setIsBotWorking(false);
    }
  };

  const handleTriggerBotPost = async () => {
    setIsBotWorking(true);
    try {
      await triggerBotPost();
      alert('Bot post created!');
    } catch (e) {
      console.error(e);
      alert('Failed to trigger bot post');
    } finally {
      setIsBotWorking(false);
    }
  };

  const handleTriggerRecentActivity = async () => {
    setIsBotWorking(true);
    try {
      const q = query(collection(db, 'posts'), limit(5));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert('No posts found to react to');
        return;
      }
      
      const promises = snapshot.docs.map(async (postDoc) => {
        await triggerBotReactions(postDoc.id);
        await triggerBotComments(postDoc.id);
      });
      
      await Promise.all(promises);
      alert('Bot activity triggered on recent posts!');
    } catch (e) {
      console.error(e);
      alert('Failed to trigger bot activity');
    } finally {
      setIsBotWorking(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0a0a0a] p-4 md:p-8 relative">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <Settings className="w-6 h-6 text-[#E31837]" />
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Settings</h1>
        </div>

        <div className="space-y-6">
          
          {/* Appearance */}
          <section className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-6">Profile Settings</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center text-white overflow-hidden cursor-pointer hover:border-[#E31837] hover:bg-zinc-800 transition-all group relative shadow-2xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {auth.currentUser?.photoURL ? (
                     <img src={auth.currentUser.photoURL} className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-50 transition-all duration-300" alt="Profile" />
                  ) : (
                     <User className="w-8 h-8 text-zinc-600 group-hover:text-[#E31837] transition-colors" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                     <Camera className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-white">Profile Picture</p>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1">Click the avatar to upload a generic square image (JPG, PNG). Max 10MB.</p>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleProfileImageUpload} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingObj}
                  className="w-full sm:w-auto bg-zinc-900 border border-white/10 px-6 py-2.5 rounded-xl text-xs text-white uppercase font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploadingObj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploadingObj ? 'Uploading...' : 'Upload New'}
                </button>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-6">Appearance</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Dark Mode</p>
                  <p className="text-xs text-zinc-500">Enable dark theme for the interface</p>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-[#E31837]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${darkMode ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </section>

          {/* Media & Data */}
          <section className="bg-zinc-950 border border-white/5 rounded-2xl p-6 space-y-6">
            <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-2">Media & Data</h2>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">HD Media on Cellular</p>
                  <p className="text-xs text-zinc-500">Auto-download HD video tapes</p>
                </div>
              </div>
              <button 
                onClick={() => setMediaUploadsOnMobile(!mediaUploadsOnMobile)}
                className={`w-12 h-6 rounded-full relative transition-colors ${mediaUploadsOnMobile ? 'bg-[#E31837]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${mediaUploadsOnMobile ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Location Permissions</p>
                  <p className="text-xs text-zinc-500">Share location for Gym Locator</p>
                </div>
              </div>
              <button 
                onClick={() => setAllowLocation(!allowLocation)}
                className={`w-12 h-6 rounded-full relative transition-colors ${allowLocation ? 'bg-[#E31837]' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${allowLocation ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </section>

          {/* Account */}
          <section className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest mb-6">Account</h2>
            
            <button className="w-full flex items-center justify-between py-2 mb-4 group">
              <div className="flex items-center gap-3 text-white font-bold group-hover:text-[#E31837] transition-colors">
                 <span>Account Details</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[#E31837] transition-colors" />
            </button>

            <button className="w-full flex items-center justify-between py-2 border-b border-white/5 pb-6 mb-6 group">
              <div className="flex items-center gap-3 text-white font-bold group-hover:text-[#E31837] transition-colors">
                 <span>Privacy Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[#E31837] transition-colors" />
            </button>

            <button 
              onClick={handleLogout}
              className="w-full bg-white/5 hover:bg-[#E31837]/10 hover:text-[#E31837] border border-white/10 hover:border-[#E31837]/30 text-white font-black uppercase text-sm py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </section>

          {/* Test Bots / QA */}
          <section className="bg-zinc-950 border border-[#E31837]/20 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-[#E31837]" />
              <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest">Test Bots & QA</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={handleSeedBots}
                disabled={isBotWorking}
                className="p-4 bg-zinc-900 border border-white/5 rounded-xl hover:border-[#E31837]/50 transition-all group flex flex-col items-center text-center gap-2"
              >
                <Shield className="w-6 h-6 text-zinc-500 group-hover:text-[#E31837]" />
                <div>
                  <p className="text-xs font-bold text-white">Seed Bots</p>
                  <p className="text-[10px] text-zinc-500">Initialize mock users</p>
                </div>
              </button>

              <button 
                onClick={handleTriggerBotPost}
                disabled={isBotWorking}
                className="p-4 bg-zinc-900 border border-white/5 rounded-xl hover:border-[#E31837]/50 transition-all group flex flex-col items-center text-center gap-2"
              >
                <Zap className="w-6 h-6 text-zinc-500 group-hover:text-[#E31837]" />
                <div>
                  <p className="text-xs font-bold text-white">Bot Post</p>
                  <p className="text-[10px] text-zinc-500">Random bot shares tape</p>
                </div>
              </button>

              <button 
                onClick={handleTriggerRecentActivity}
                disabled={isBotWorking}
                className="p-4 bg-zinc-900 border border-white/5 rounded-xl hover:border-[#E31837]/50 transition-all group flex flex-col items-center text-center gap-2"
              >
                <div className="flex gap-1 group-hover:text-[#E31837] text-zinc-500">
                  <Heart className="w-4 h-4" />
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Bot Swarm</p>
                  <p className="text-[10px] text-zinc-500">React to recent posts</p>
                </div>
              </button>
            </div>
            
            {isBotWorking && (
              <p className="text-[10px] text-[#E31837] font-black uppercase tracking-widest animate-pulse text-center">
                Processing Bot Logic...
              </p>
            )}
          </section>

          <p className="text-center text-zinc-600 text-xs font-mono uppercase">FightNet Build v1.0.4-beta</p>

        </div>
      </div>
    </div>
  );
}
