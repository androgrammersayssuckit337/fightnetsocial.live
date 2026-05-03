import React, { useState } from 'react';
import { Star, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';

const MOCK_SPONSORS = [
  { id: '1', name: 'IRON PEAK Performance', match: 98, img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&q=80', req: '7-0 Record minimum' },
  { id: '2', name: 'VTX Supplements', match: 92, img: 'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=300&q=80', req: 'Heavyweight / LHW' },
  { id: '3', name: 'Grind Athletics', match: 85, img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80', req: 'Strong social presence' }
];

export function SponsorsPage() {
  const { currentUser, userProfile } = useAuth();
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [pitch, setPitch] = useState('');

  const handleApply = async (sponsorId: string) => {
    if (!currentUser || !pitch.trim()) return;
    
    try {
      await addDoc(collection(db, 'sponsorships'), {
        fighterId: currentUser.uid,
        sponsorId,
        status: 'pending',
        pitch,
        createdAt: serverTimestamp()
      });
      setApplyingTo(null);
      setPitch('');
      alert("Application sent to advocating agent!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sponsorships', auth);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 border-b border-[#222] pb-4">
        <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Sponsor Advocate</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Connect with brands that believe in you</p>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg mb-8">
        <h2 className="text-sm font-black uppercase border-b border-zinc-800 pb-4 mb-4 flex items-center justify-between tracking-widest">
          <span>Top Matches</span>
          <span className="text-[10px] tracking-widest text-[#E31837]">FIGHTNET ALGORITHM</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_SPONSORS.map(sponsor => (
            <div key={sponsor.id} className="bg-[#0c0c0c] border border-zinc-800 flex flex-col group relative overflow-hidden rounded-lg">
              <div className="h-32 bg-cover bg-center opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" style={{ backgroundImage: `url(${sponsor.img})` }}></div>
              <div className="p-4 flex-1 flex flex-col z-10 border-t border-zinc-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm tracking-tight uppercase max-w-[70%] leading-tight text-white">{sponsor.name}</h3>
                  <div className="bg-[#E31837]/20 text-[#E31837] text-[10px] px-2 py-0.5 font-bold rounded">
                    {sponsor.match}%
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">{sponsor.req}</p>
                
                <div className="mt-auto">
                  {applyingTo === sponsor.id ? (
                    <div className="space-y-2">
                       <textarea 
                         value={pitch}
                         onChange={e => setPitch(e.target.value)}
                         placeholder="Short pitch..." 
                         className="w-full bg-[#0a0a0a] border border-zinc-700 rounded p-2 text-xs text-white focus:outline-none focus:border-[#E31837]"
                         rows={2}
                       />
                       <div className="flex gap-2">
                         <button onClick={() => setApplyingTo(null)} className="flex-1 py-1.5 text-[10px] font-bold uppercase rounded text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
                         <button onClick={() => handleApply(sponsor.id)} className="flex-1 bg-[#E31837] py-1.5 text-[10px] font-bold text-white uppercase rounded hover:bg-red-700 transition">Send</button>
                       </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setApplyingTo(sponsor.id)}
                      className="w-full border border-zinc-700 rounded py-2 text-[10px] uppercase tracking-widest font-bold hover:border-[#E31837] hover:text-[#E31837] transition-colors text-white"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 p-6 flex flex-col md:flex-row items-center justify-between rounded-lg">
         <div className="mb-4 md:mb-0">
           <h3 className="font-black text-lg uppercase mb-1 flex items-center gap-2 italic tracking-tighter text-white"><Star className="w-5 h-5 text-[#E31837]" /> Need an Agent?</h3>
           <p className="text-zinc-500 text-xs tracking-wide">FightNet PRO members get dedicated sponsorship advocates to negotiate deals.</p>
         </div>
         <button className="bg-white text-black px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded flex items-center hover:bg-zinc-200 transition">
             UPGRADE TO PRO <Zap className="w-3 h-3 ml-2" />
         </button>
      </div>
    </div>
  );
}
