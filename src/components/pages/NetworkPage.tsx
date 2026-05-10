import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Trophy, Briefcase, Star, MapPin, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NetworkPage() {
  const [activeTab, setActiveTab] = useState<'fighter' | 'sponsor' | 'fan'>('fighter');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'users'),
        where('role', '==', activeTab),
        limit(20)
      );
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
     if (!currentUser) return;
     if (seeding) return;
     setSeeding(true);
     try {
        const testProfiles = [
           { id: 'test_fighter_1', displayName: 'Jason "The Hammer" Cole', email: 'jason@example.com', role: 'fighter', record: '12-2-0', gym: 'Top Team MMA', isPro: true, createdAt: serverTimestamp(), profileImageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=200&q=80', bio: 'Looking for striking partners.' },
           { id: 'test_fighter_2', displayName: 'Marcus Silva', email: 'marcus@example.com', role: 'fighter', record: '5-0-0', gym: 'Gracie Barra', isPro: false, createdAt: serverTimestamp(), profileImageUrl: 'https://images.unsplash.com/photo-1583468982228-19f19164aee2?w=200&q=80', bio: 'BJJ brown belt making the transition' },
           { id: 'test_sponsor_1', displayName: 'Iron Peak Performance', email: 'sponsor@ironpeak.com', role: 'sponsor', createdAt: serverTimestamp(), profileImageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&q=80', bio: 'Premium gear for premium athletes.' },
           { id: 'test_fan_1', displayName: 'MMA Superfan', email: 'fan@example.com', role: 'fan', createdAt: serverTimestamp(), bio: 'Just here for the knockouts' }
        ];

        for (const profile of testProfiles) {
           await setDoc(doc(db, 'users', profile.id), profile);
        }
        await fetchUsers(); // Refresh the list
     } catch (err) {
        console.error(err);
     } finally {
        setSeeding(false);
     }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.gym?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#0a0a0a] min-h-full">
      <header className="mb-8 border-b border-[#222] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Combat Directory</h1>
          <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Discover Fighters, Brands and Fans</p>
        </div>
        <button 
          onClick={handleSeedData}
          disabled={seeding}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-[#E31837] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors"
        >
          <Database className="w-4 h-4" />
          {seeding ? 'Seeding...' : 'Add Test Profiles'}
        </button>
      </header>

      <div className="flex gap-4 border-b border-[#222] mb-6">
        {[
          { id: 'fighter', label: 'Fighters', icon: <Trophy className="w-4 h-4" /> },
          { id: 'sponsor', label: 'Sponsors', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'fan', label: 'Fans', icon: <Star className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'fighter' | 'sponsor' | 'fan')}
            className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.id 
                ? 'text-[#E31837] border-b-2 border-[#E31837]' 
                : 'text-zinc-500 hover:text-white border-b-2 border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="relative mb-8">
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${activeTab}s...`}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors"
        />
        <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-3.5" />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <Link 
              to={`/app/profile/${user.id}`} 
              key={user.id} 
              className="bg-zinc-950 border border-white/5 rounded-2xl p-6 hover:border-[#E31837]/50 transition-colors group flex items-start gap-4"
            >
              <img 
                src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=0c0c0c&color=fff`} 
                alt="" 
                className="w-16 h-16 rounded-full border-2 border-white/10 object-cover group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black uppercase italic tracking-tight truncate group-hover:text-[#E31837] transition-colors">
                  {user.displayName}
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">{user.role}</p>
                {user.gym && (
                   <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                     <MapPin className="w-3 h-3 text-[#E31837]" /> {user.gym}
                   </p>
                )}
                {user.record && (
                   <div className="mt-2 text-[10px] bg-[#E31837]/10 text-[#E31837] px-2 py-0.5 rounded inline-block font-black uppercase">
                     {user.record}
                   </div>
                )}
              </div>
            </Link>
          ))}
          {filteredUsers.length === 0 && (
             <div className="col-span-full py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
               No {activeTab}s found matching your search.
             </div>
          )}
        </div>
      )}
    </div>
  );
}
