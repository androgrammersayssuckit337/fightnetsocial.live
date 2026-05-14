import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';

export function MessagesPage() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to connections that are accepted -> create chats if needed or just show them in search
    const fetchChats = async () => {
      try {
        const q = query(collection(db, 'chats'), where('users', 'array-contains', currentUser.uid), orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const chatListObj = await Promise.all(snapshot.docs.map(async d => {
             const data = d.data();
             const otherUserId = data.users.find((u: string) => u !== currentUser.uid);
             let otherUser = { displayName: 'Unknown', profileImageUrl: '' };
             if (otherUserId) {
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (userDoc.exists()) {
                   otherUser = userDoc.data() as any;
                }
             }
             return { id: d.id, ...data, otherUser, otherUserId };
          }));
          setChats(chatListObj);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'chats', auth);
        });
        return () => unsubscribe();
      } catch (err) {
        console.error(err);
      }
    };
    fetchChats();
  }, [currentUser]);

  useEffect(() => {
    if (!activeChat) return;

    const q = query(
       collection(db, `chats/${activeChat.id}/messages`),
       orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
       setMessages(snapshot.docs.map(doc => {
          const data = doc.data({ serverTimestamps: 'estimate' });
          return { id: doc.id, ...data };
       }));
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, `chats/${activeChat.id}/messages`, auth);
    });

    return () => unsubscribe();
  }, [activeChat]);

  // Search for users to message
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
       const usersRef = collection(db, 'users');
       const q = query(usersRef); // in a real app use specialized search / caching
       const snap = await getDocs(q);
       const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((d: any) => d.id !== currentUser?.uid && d.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));
       setSuggestions(results);
    };
    fetchSuggestions();
  }, [searchTerm, currentUser]);

  const handleStartChat = async (user: any) => {
     if (!currentUser) return;
     // Check if chat exists
     const existingChat = chats.find(c => c.users.includes(user.id));
     if (existingChat) {
       setActiveChat(existingChat);
       setSearchTerm('');
       return;
     }

     try {
       const chatId = [currentUser.uid, user.id].sort().join('_');
       await setDoc(doc(db, 'chats', chatId), {
         users: [currentUser.uid, user.id],
         updatedAt: serverTimestamp()
       });
       // wait for it to show in the list, then select it
       setActiveChat({ id: chatId, otherUser: user, authUser: currentUser });
       setSearchTerm('');
     } catch (err) {
       handleFirestoreError(err, OperationType.CREATE, 'chats', auth);
     }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        senderId: currentUser.uid,
        text: msgText,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chats', activeChat.id), {
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${activeChat.id}/messages`, auth);
    }
  };

  return (
    <div className="flex bg-[#0c0c0c] border border-zinc-800 rounded-lg h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] overflow-hidden m-4 md:m-6">
      {/* Chat List */}
      <div className={`w-full md:w-80 border-r border-[#222] flex flex-col flex-shrink-0 bg-[#0a0a0a] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-lg font-black uppercase text-white tracking-tighter italic">Messages</h2>
          <button onClick={() => searchInputRef.current?.focus()} className="text-zinc-500 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
        </div>
        <div className="p-3 border-b border-[#222] bg-zinc-900/40">
          <div className="relative">
             <input 
               ref={searchInputRef}
               type="text" 
               placeholder="Search friends or suggested..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-[#0a0a0a] border border-zinc-800 p-2 pl-8 text-xs text-white focus:outline-none focus:border-[#E31837] rounded"
             />
             <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          </div>
          
          {searchTerm && suggestions.length > 0 && (
             <div className="absolute z-10 w-full md:w-auto left-4 right-4 md:right-auto md:w-72 mt-2 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-2 max-h-60 overflow-y-auto">
               <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold px-2 py-1">Suggested Connects</div>
               {suggestions.map(sug => (
                  <div 
                    key={sug.id} 
                    onClick={() => handleStartChat(sug)}
                    className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-pointer"
                  >
                     <img src={sug.profileImageUrl || `https://ui-avatars.com/api/?name=${sug.displayName}&background=000&color=fff`} className="w-8 h-8 rounded-full object-cover" alt="" />
                     <div>
                        <div className="text-xs font-bold text-white">{sug.displayName}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{sug.role}</div>
                     </div>
                  </div>
               ))}
             </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="p-4 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading comms...</div>
          ) : chats.length === 0 ? (
             <div className="p-4 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">No active comms</div>
          ) : chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat)}
              className={`p-4 border-b border-[#222] hover:bg-zinc-900/50 cursor-pointer flex items-center gap-3 group transition-colors ${activeChat?.id === chat.id ? 'bg-zinc-900/50 border-l-2 border-l-[#E31837]' : ''}`}
            >
              <img src={chat.otherUser?.profileImageUrl || `https://ui-avatars.com/api/?name=${chat.otherUser?.displayName}&background=222&color=fff`} alt="" className="w-10 h-10 rounded-full border border-zinc-700 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-sm tracking-tight truncate text-white uppercase">{chat.otherUser?.displayName}</h3>
                  <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                     {chat.updatedAt?.seconds ? formatDistanceToNow(chat.updatedAt.seconds * 1000, { addSuffix: true }) : ''}
                  </span>
                </div>
                <p className="text-xs truncate text-zinc-500">Tap to view comms</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* active chat area */}
      <div className={`flex-1 flex-col bg-[#050505] ${activeChat ? 'flex' : 'hidden md:flex'}`}>
         {activeChat ? (
           <>
             <div className="p-4 border-b border-[#222] bg-[#0a0a0a] flex items-center gap-4">
                <button className="md:hidden text-zinc-400 p-2" onClick={() => setActiveChat(null)}>←</button>
                <img src={activeChat.otherUser?.profileImageUrl || `https://ui-avatars.com/api/?name=${activeChat.otherUser?.displayName}&background=222&color=fff`} className="w-8 h-8 rounded-full border border-zinc-700 object-cover" alt="" />
                <div>
                   <div className="text-sm font-black uppercase text-white tracking-widest">{activeChat.otherUser?.displayName}</div>
                   <div className="text-[10px] text-[#E31837] uppercase font-bold tracking-widest">SECURE CHANNEL</div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                   const isMe = msg.senderId === currentUser?.uid;
                   return (
                     <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-[#E31837] text-white rounded-br-sm' : 'bg-zinc-800 text-white rounded-bl-sm'}`}>
                           {msg.text}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1 uppercase font-bold tracking-widest">
                           {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                     </div>
                   )
                })}
                <div ref={messagesEndRef} />
             </div>

             <form onSubmit={sendMessage} className="p-4 border-t border-[#222] bg-[#0a0a0a] flex gap-2">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Transmit message..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#E31837]"
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="bg-[#E31837] text-white p-3 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
             </form>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 select-none">
             <div className="text-6xl mb-4 font-black italic tracking-tighter opacity-5 text-[#E31837]">FIGHTNET SECURE COMMS</div>
             <p className="text-xs uppercase tracking-widest font-bold">Select a conversation or search</p>
           </div>
         )}
      </div>
    </div>
  );
}
