import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Ticket, Plus, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';

const UPCOMING_FIGHTS = [
  { 
    id: '1', 
    name: 'UFC 302: Makhachev vs Poirier', 
    location: 'Newark, New Jersey', 
    date: '06.01.2024', 
    time: '10:00 PM EST', 
    discipline: 'MMA',
    mainBouts: ['Islam Makhachev vs Dustin Poirier', 'Sean Strickland vs Paulo Costa'] 
  },
  { 
    id: '2', 
    name: 'PFL 4: 2024 Regular Season', 
    location: 'Uncasville, CT', 
    date: '06.13.2024', 
    time: '6:30 PM EST', 
    discipline: 'MMA',
    mainBouts: ['Valentin Moldavsky vs Linton Vassell', 'Dakota Ditcheva vs Chelsea Hackett'] 
  },
  { 
    id: '3', 
    name: 'UFC Fight Night: Whittaker vs Chimaev', 
    location: 'Riyadh, Saudi Arabia', 
    date: '06.22.2024', 
    time: '3:00 PM EST', 
    discipline: 'MMA',
    mainBouts: ['Robert Whittaker vs Khamzat Chimaev', 'Sergei Pavlovich vs Alexander Volkov'] 
  },
];

export function SchedulesPage() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<any[]>(UPCOMING_FIGHTS);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    discipline: '',
    mainBouts: ''
  });

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'events')); // simple query, no sort if index not ready
        const querySnapshot = await getDocs(q);
        const fetchedEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setEvents([...UPCOMING_FIGHTS, ...fetchedEvents]);
      } catch (err) {
        if (currentUser) {
           handleFirestoreError(err, OperationType.LIST, 'events', auth);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    try {
      const boutsArray = formData.mainBouts.split(',').map(b => b.trim()).filter(b => b);
      const newEvent = {
        submitterId: currentUser.uid,
        name: formData.name.trim(),
        date: formData.date.trim(),
        time: formData.time.trim(),
        location: formData.location.trim(),
        discipline: formData.discipline.trim(),
        mainBouts: boutsArray,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'events'), newEvent);
      
      setEvents(prev => [...prev, { ...newEvent, id: docRef.id }]);
      setShowForm(false);
      setFormData({ name: '', date: '', time: '', location: '', discipline: '', mainBouts: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'events', auth);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 border-b border-[#222] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Fight Schedules</h1>
          <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Upcoming Pro & Semi-Pro Events</p>
        </div>
        {currentUser && (
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="flex items-center gap-2 bg-[#E31837] text-white px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-red-700 transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Submit Event'}
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-white/5 p-6 rounded-2xl mb-8 space-y-4 shadow-xl">
          <h2 className="text-lg font-black uppercase text-white mb-4">Submit Local Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-black uppercase tracking-widest ml-1">Event Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" placeholder="e.g. Fight Night 45" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-black uppercase tracking-widest ml-1">Discipline</label>
              <input required value={formData.discipline} onChange={e => setFormData({...formData, discipline: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" placeholder="e.g. MMA, Boxing, Muay Thai" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-black uppercase tracking-widest ml-1">Date</label>
              <input required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" placeholder="e.g. 06.12.2024" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-black uppercase tracking-widest ml-1">Time</label>
              <input required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" placeholder="e.g. 7:00 PM EST" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-black uppercase tracking-widest ml-1">Location</label>
            <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" placeholder="e.g. Local Arena, City, State" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-black uppercase tracking-widest ml-1">Main Bouts (Comma separated)</label>
            <input required value={formData.mainBouts} onChange={e => setFormData({...formData, mainBouts: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none" placeholder="e.g. John vs Smith, Alex vs Marc" />
          </div>
          <button type="submit" disabled={submitting} className="w-full mt-4 bg-[#E31837] text-white px-6 py-4 rounded-xl font-black uppercase text-sm hover:bg-red-700 transition disabled:opacity-50 flex justify-center items-center gap-2">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {submitting ? 'Submitting...' : 'Confirm Submission'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-[#E31837] animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((fight) => (
            <div key={fight.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden group hover:border-[#E31837] transition-all relative">
              {fight.submitterId && (
                <div className="absolute top-0 right-0 bg-[#E31837] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl">Local Event</div>
              )}
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-[#E31837] font-mono text-xs font-bold tracking-widest uppercase">
                    <Calendar className="w-3 h-3" /> {fight.date} • {fight.time}
                    {fight.discipline && <span className="text-zinc-500 mx-2">|</span>}
                    {fight.discipline && <span className="text-zinc-300">{fight.discipline}</span>}
                  </div>
                  <h2 className="text-xl font-black uppercase text-white tracking-tight">{fight.name}</h2>
                  <div className="flex items-center gap-1 text-zinc-500 text-xs italic">
                    <MapPin className="w-3 h-3" /> {fight.location}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 max-w-sm">
                  <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter mb-1">Featured Bouts</div>
                  {fight.mainBouts && fight.mainBouts.map((bout: string, idx: number) => (
                    <div key={idx} className="text-xs text-zinc-300 font-medium px-3 py-1 bg-black/40 rounded border border-zinc-800 break-words">
                      {bout}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#222] pt-4 md:pt-0 md:pl-6 shrink-0">
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(fight.name + ' tickets')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-black px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded hover:bg-zinc-200 transition flex items-center gap-2"
                  >
                    <Ticket className="w-4 h-4" /> Buy Tickets
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!currentUser && (
        <div className="mt-12 p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center max-w-2xl mx-auto">
          <h3 className="text-sm font-bold uppercase text-white mb-2 italic">Are you a promoter?</h3>
          <p className="text-xs text-zinc-500 mb-4">Log in to list your regional semi-pro events on FightNet to get noticed by scouting agents and local fans.</p>
        </div>
      )}
    </div>
  );
}

