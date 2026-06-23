import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark, TrendingUp, Users, MessageSquare, ChevronRight, DollarSign, Star } from 'lucide-react';

const mockPitches = [
  { id: 1, name: 'Alex "The Viper" Chen', goal: '$10,000', raised: '$4,250', investors: 12, purpose: 'Training camp for title eliminator', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400&h=400' },
  { id: 2, name: 'Sarah Jenkins', goal: '$5,000', raised: '$5,000', investors: 34, purpose: 'Travel & corner fees for international debut', image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=400&h=400', funded: true },
  { id: 3, name: 'Marcus Silva', goal: '$15,000', raised: '$2,100', investors: 5, purpose: 'Full-time physical therapy & conditioning', image: 'https://images.unsplash.com/photo-1599058917212-97d150126cb3?auto=format&fit=crop&q=80&w=400&h=400' }
];

const mockDiscussions = [
  { id: 1, author: 'CombatVentures', time: '2h ago', title: 'Scouting report: North American regional scene Q3', replies: 24, likes: 56 },
  { id: 2, author: 'FightFan88', time: '5h ago', title: 'Who is the best prospect under 25 right now?', replies: 142, likes: 89 },
  { id: 3, author: 'ProManager_Dan', time: '1d ago', title: 'Understanding amateur vs pro contracts in modern MMA', replies: 45, likes: 112 },
];

export function InvestorsPage() {
  const [activeTab, setActiveTab] = useState<'pitches' | 'community'>('pitches');

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-8 pb-32">
      <header className="mb-8 pt-8">
        <div className="flex items-center gap-3 text-[#E31837] mb-4">
          <Landmark className="w-8 h-8" />
          <h1 className="text-4xl font-black uppercase tracking-widest text-white">Investors & Community</h1>
        </div>
        <p className="text-zinc-400 text-sm font-medium tracking-wide">Back emerging talent and connect with the fight community.</p>
      </header>

      <div className="flex bg-zinc-900 border border-white/10 rounded-xl p-1 mb-8">
        <button
          onClick={() => setActiveTab('pitches')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-2 ${
            activeTab === 'pitches' ? 'bg-[#E31837] text-white shadow-lg' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Fighter Pitches
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-2 ${
            activeTab === 'community' ? 'bg-[#E31837] text-white shadow-lg' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Community Board
        </button>
      </div>

      {activeTab === 'pitches' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPitches.map((pitch) => {
             const percent = Math.min(100, Math.round((parseInt(pitch.raised.replace(/\D/g,'')) / parseInt(pitch.goal.replace(/\D/g,''))) * 100));
             return (
              <motion.div 
                key={pitch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 overflow-hidden rounded-2xl border border-white/10 flex flex-col group relative"
              >
                {pitch.funded && (
                  <div className="absolute top-4 right-4 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-10">
                    Fully Funded
                  </div>
                )}
                <div className="h-48 relative overflow-hidden bg-black">
                  <img src={pitch.image} alt={pitch.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
                  <h3 className="absolute bottom-4 left-4 text-xl font-black italic uppercase tracking-wider text-white drop-shadow-md">{pitch.name}</h3>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-zinc-400 text-sm mb-4 leading-relaxed flex-1">{pitch.purpose}</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                       <span className="text-zinc-300">Raised: {pitch.raised}</span>
                       <span className="text-zinc-500">Goal: {pitch.goal}</span>
                    </div>
                    <div className="h-2 bg-black rounded-full overflow-hidden border border-white/5">
                      <div className={`h-full ${pitch.funded ? 'bg-green-500' : 'bg-[#E31837]'}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 font-mono">{pitch.investors} Backers</p>
                  </div>
                  
                  <button 
                    disabled={pitch.funded}
                    className={`w-full py-3 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors ${
                      pitch.funded 
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    {pitch.funded ? 'Closed' : 'Back Fighter'}
                    {!pitch.funded && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
             );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black uppercase italic tracking-wider">Top Discussions</h2>
            <button className="bg-[#E31837] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded hover:bg-red-700 transition">
              New Thread
            </button>
          </div>
          
          <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            {mockDiscussions.map((disc) => (
              <div key={disc.id} className="p-5 hover:bg-white/5 transition flex items-start gap-4 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-zinc-400 group-hover:text-[#E31837] transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-white font-bold text-sm tracking-wide group-hover:text-[#E31837] transition-colors">{disc.title}</h3>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-4">{disc.time}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                    <span>By {disc.author}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {disc.replies}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {disc.likes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
