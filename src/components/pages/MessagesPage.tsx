import React from 'react';
import { Search, Edit } from 'lucide-react';

const MOCK_CHATS = [
  { id: 1, name: 'Coach Mike', preview: 'You got potential. Let\'s talk.', time: '10m', unread: true, img: 'https://ui-avatars.com/api/?name=Coach+Mike&background=222&color=fff' },
  { id: 2, name: 'Sponsorship Agent', preview: 'We reviewed your tape.', time: '2h', unread: false, img: 'https://ui-avatars.com/api/?name=Agent&background=E31837&color=fff' },
  { id: 3, name: 'Jason "The Hammer" Cole', preview: 'Good sparring today bro.', time: '1d', unread: false, img: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=100&q=80' },
];

export function MessagesPage() {
  return (
    <div className="flex bg-[#0c0c0c] border border-zinc-800 rounded-lg h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] overflow-hidden m-4 md:m-6">
      {/* Chat List */}
      <div className="w-full md:w-80 border-r border-[#222] flex flex-col flex-shrink-0 bg-[#0a0a0a]">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-lg font-black uppercase text-white tracking-tighter italic">Messages</h2>
          <button className="text-zinc-500 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
        </div>
        <div className="p-3 border-b border-[#222] bg-zinc-900/40">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-[#0a0a0a] border border-zinc-800 p-2 pl-8 text-xs text-white focus:outline-none focus:border-[#E31837] rounded"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_CHATS.map(chat => (
            <div key={chat.id} className="p-4 border-b border-[#222] hover:bg-zinc-900/50 cursor-pointer flex items-center gap-3 group transition-colors">
              <img src={chat.img} alt="" className="w-10 h-10 rounded-full border border-zinc-700 grayscale group-hover:grayscale-0 transition-all duration-300" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`font-bold text-sm tracking-tight truncate ${chat.unread ? 'text-white' : 'text-zinc-400'}`}>{chat.name}</h3>
                  <span className="text-[10px] text-zinc-500 shrink-0 font-mono">{chat.time}</span>
                </div>
                <p className={`text-xs truncate ${chat.unread ? 'text-zinc-300 font-medium' : 'text-zinc-600'}`}>{chat.preview}</p>
              </div>
              {chat.unread && <div className="w-2 h-2 bg-[#E31837] rounded-full shrink-0"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* active chat area (hidden on mobile unless a chat is selected, but keeping it simple here) */}
      <div className="hidden md:flex flex-1 flex-col bg-[#050505]">
         <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 select-none">
           <div className="text-6xl mb-4 font-black italic tracking-tighter opacity-5 text-[#E31837]">FIGHTNET SECURE COMMS</div>
           <p className="text-xs uppercase tracking-widest font-bold">Select a conversation</p>
         </div>
      </div>
    </div>
  );
}
