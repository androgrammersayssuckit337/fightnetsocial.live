import React, { useState } from 'react';
import { Star, Zap, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';

const MOCK_SPONSORS = [
  { 
    id: 'aka', 
    name: 'AKA (American Kombat Alliance)', 
    baseMatch: 70, 
    img: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=300&q=80', 
    req: 'Amateur/Pro active in LA', 
    website: 'https://aka-fights.com' 
  },
  { 
    id: 'coushatta', 
    name: 'Coushatta Casino Resort', 
    baseMatch: 50, 
    img: 'https://images.unsplash.com/photo-1596567100027-66aa33a647e3?w=300&q=80', 
    req: 'High record fighters', 
    website: 'https://www.coushattacasinoresort.com' 
  },
  { 
    id: 'navarre', 
    name: 'Navarre Auto Group', 
    baseMatch: 40, 
    img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&q=80', 
    req: 'Local Lake Charles influence', 
    website: 'https://www.billynavarre.com' 
  },
  { 
    id: '929lake', 
    name: '92.9 The Lake (SWLA)', 
    baseMatch: 60, 
    img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&q=80', 
    req: 'Social media presence', 
    website: 'https://929thelake.com' 
  }
];

function calculateMatchPercentage(profile: any, sponsor: any) {
  if (!profile) return sponsor.baseMatch;
  let score = sponsor.baseMatch;
  const wins = parseInt(profile.record?.split('-')[0]) || 0;
  
  if (sponsor.id === 'aka') {
    if (wins >= 1) score += 20;
    if (profile.role === 'fighter') score += 10;
  } else if (sponsor.id === 'coushatta') {
    if (profile.isPro) score += 30;
    if (wins >= 5) score += 15;
  } else if (sponsor.id === 'navarre') {
    if (profile.bio?.toLowerCase().includes('lake charles')) score += 40;
  } else if (sponsor.id === '929lake') {
    if (profile.bio?.length > 50) score += 25;
  }
  
  return Math.min(99, score);
}

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
          <span className="text-sm font-brand tracking-wider text-zinc-200 drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)]">FightNet Algorithm</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_SPONSORS.map(sponsor => (
            <div key={sponsor.id} className="bg-[#0c0c0c] border border-zinc-800 flex flex-col group relative overflow-hidden rounded-lg">
              <div className="h-32 bg-cover bg-center opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" style={{ backgroundImage: `url(${sponsor.img})` }}></div>
              <div className="p-4 flex-1 flex flex-col z-10 border-t border-zinc-800">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <h3 className="font-bold text-sm tracking-tight uppercase leading-tight text-white">{sponsor.name}</h3>
                    {sponsor.website && (
                      <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors flex-shrink-0" title={`Visit ${sponsor.name}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="bg-[#E31837]/20 text-[#E31837] text-[10px] px-2 py-0.5 font-bold rounded">
                    {calculateMatchPercentage(userProfile, sponsor)}%
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
