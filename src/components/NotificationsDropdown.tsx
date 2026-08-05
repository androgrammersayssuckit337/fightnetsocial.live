import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, MessageSquare, Heart, UserPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: 'message' | 'like' | 'follow';
  fromUserId: string;
  fromUserName?: string;
  fromUserImage?: string;
  createdAt: number;
  read: boolean;
}

export function NotificationsDropdown() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        notifs.push({
          id: docSnap.id,
          ...data
        } as Notification);
        if (!data.read) unread++;
      });
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (err) => {
       console.error("Notifications listener error", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', id), {
        read: true
      });
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const unread = notifications.filter(n => !n.read);
    unread.forEach(n => markAsRead(n.id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getText = (type: string) => {
    switch (type) {
      case 'message': return "sent you a message";
      case 'like': return "liked your post";
      case 'follow': return "started following you";
      default: return "interacted with you";
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 rounded-full border border-white/5"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-[#E31837] rounded-full text-[9px] font-black flex items-center justify-center text-white border-2 border-[#0a0a0a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col max-h-[400px]"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                <h3 className="font-black text-sm uppercase tracking-widest text-white">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold transition-colors">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                    <p>You're all caught up</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => markAsRead(notif.id)}
                        className={`p-4 border-b border-zinc-900/50 flex gap-3 hover:bg-zinc-900/80 transition-colors cursor-pointer ${!notif.read ? 'bg-zinc-900/30' : ''}`}
                      >
                        <div className="shrink-0 mt-1">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm text-zinc-300 break-words leading-snug">
                             <span className="font-bold text-white mr-1">{notif.fromUserName || 'Someone'}</span>
                             {getText(notif.type)}
                           </p>
                           <p className="text-[10px] text-zinc-600 font-mono mt-1">
                             {notif.createdAt ? formatDistanceToNow(notif.createdAt, { addSuffix: true }) : 'Just now'}
                           </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-[#E31837] shrink-0 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
