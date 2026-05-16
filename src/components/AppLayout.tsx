import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings, Hexagon, Home, Users, Landmark, MessageSquare, MapPin, Calendar, ShoppingCart, TrendingUp, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeedPage } from './pages/FeedPage';
import { LandingPage } from './pages/LandingPage';
import { MessagesPage } from './pages/MessagesPage';
import { SponsorsPage } from './pages/SponsorsPage';
import { GymLocatorPage } from './pages/GymLocatorPage';
import { StorePage } from './pages/StorePage';
import { CareerPage } from './pages/CareerPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { ProfilePage } from './pages/ProfilePage';
import { NetworkPage } from './pages/NetworkPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvestorsPage } from './pages/InvestorsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppLayout() {
  const { logout, userProfile } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Main Feed', path: '/app', icon: Home },
    { label: 'Network', path: '/app/network', icon: Users },
    { label: 'Investors & Community', path: '/app/investors', icon: Landmark },
    { label: 'Messenger', path: '/app/messages', icon: MessageSquare },
    { label: 'Gym Locator', path: '/app/gyms', icon: MapPin },
    { label: 'Schedules', path: '/app/schedules', icon: Calendar },
    { label: 'FightNet Shop', path: '/app/store', icon: ShoppingCart },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ];
  
  const fighterTools = [
    { label: 'Career Path', path: '/app/career', icon: TrendingUp },
    { label: 'Agent Portal', path: '/app/sponsors', icon: Briefcase },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar fixed to the Left on all views */}
      <aside className="w-16 md:w-64 flex flex-col border-r border-[#222] bg-[#0a0a0a] z-40 shrink-0 pb-safe md:pb-0">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-[#222] shrink-0">
          <h1 className="text-3xl font-brand tracking-wider hidden md:inline-block drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)] pr-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-300 to-zinc-700">FightNet</h1>
          <h1 className="text-2xl font-brand tracking-wider md:hidden drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)] bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-300 to-zinc-700">FN</h1>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center justify-center md:justify-start px-0 md:px-6 py-3 transition-colors group ${
                  isActive 
                    ? 'md:bg-zinc-900 border-l-4 border-[#E31837] text-white bg-zinc-900/50' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#E31837]' : 'text-zinc-500 group-hover:text-white transition-colors'}`} />
                <span className={`text-sm font-semibold ml-4 hidden md:block ${!isActive && 'italic'}`}>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-6 pb-2 px-0 md:px-6 text-center md:text-left text-[8px] md:text-[10px] uppercase tracking-widest text-zinc-600 font-bold overflow-hidden">
            <span className="hidden md:inline">Fighter Tools</span>
            <span className="md:hidden block truncate">Tools</span>
          </div>
          {fighterTools.map((item) => {
             const isActive = location.pathname === item.path;
             const Icon = item.icon;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 title={item.label}
                 className={`flex items-center justify-center md:justify-start px-0 md:px-6 py-3 transition-colors group ${
                   isActive 
                     ? 'md:bg-zinc-900 border-l-4 border-[#E31837] text-white bg-zinc-900/50' 
                     : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border-l-4 border-transparent'
                 }`}
               >
                 <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#E31837]' : 'text-zinc-500 group-hover:text-white transition-colors'}`} />
                 <span className={`text-sm font-semibold ml-4 hidden md:block ${!isActive && 'italic'}`}>{item.label}</span>
               </Link>
             );
          })}
        </nav>

        <div className="shrink-0 flex flex-col">
          {userProfile?.role === 'fighter' && (
            <div className="hidden md:block p-4 bg-zinc-900 m-4 rounded border border-zinc-800">
              <p className="text-[11px] text-zinc-400 mb-2 uppercase tracking-wide">Pro Access</p>
              <p className="text-lg font-bold leading-none mb-1">$9.99/mo</p>
              <p className="text-[10px] text-zinc-500 mb-3">Unlock Agents & Scouting</p>
              <button className="w-full py-2 bg-[#E31837] text-white text-[11px] font-black uppercase tracking-tighter rounded hover:bg-red-700 transition">Go Pro Now</button>
            </div>
          )}
          
          <Link to="/app/career" title="Profile & Career" className="p-3 md:p-4 border-t border-[#222] flex items-center justify-center md:justify-start hover:bg-zinc-900 transition-colors cursor-pointer group">
             <div className="flex items-center space-x-3">
               <img src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile?.displayName}&background=0c0c0c&color=fff`} className="w-8 h-8 rounded-full border border-zinc-700 object-cover shrink-0" alt="Avatar"/>
               <div className="overflow-hidden hidden md:block">
                 <p className="font-bold text-xs truncate max-w-[100px] group-hover:text-[#E31837] transition-colors">{userProfile?.displayName}</p>
                 <p className="text-[10px] text-zinc-500 uppercase">{userProfile?.role}</p>
               </div>
             </div>
           </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-[#222] flex items-center justify-between px-4 md:px-8 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center space-x-6">
            <div className="md:hidden text-zinc-500 text-[10px] font-mono uppercase truncate max-w-[150px]">[ Live: amateur_04 ]</div>
            <div className="hidden md:block text-zinc-500 text-xs font-mono uppercase">[ Live Stream: amateur_circuit_04 ]</div>
          </div>
          <div className="flex items-center space-x-4">
            {!userProfile?.profileImageUrl && (
              <Link to="/app/career" className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-[#E31837]/30 text-[#E31837] text-[9px] font-black uppercase rounded animate-pulse">
                Complete Profile
              </Link>
            )}
            <Link to="/app/settings" className="p-2 text-zinc-500 hover:text-white transition-colors md:hidden">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto custom-scrollbar relative overflow-x-hidden">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><FeedPage /></motion.div>} />
              <Route path="/network" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><NetworkPage /></motion.div>} />
              <Route path="/messages" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><MessagesPage /></motion.div>} />
              <Route path="/sponsors" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><SponsorsPage /></motion.div>} />
              <Route path="/gyms" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><GymLocatorPage /></motion.div>} />
              <Route path="/schedules" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><SchedulesPage /></motion.div>} />
              <Route path="/store" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><StorePage /></motion.div>} />
              <Route path="/career" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><CareerPage /></motion.div>} />
              <Route path="/investors" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><InvestorsPage /></motion.div>} />
              <Route path="/profile/:userId" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><ProfilePage /></motion.div>} />
              <Route path="/settings" element={<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}><SettingsPage /></motion.div>} />
              <Route path="*" element={<Navigate to="/app" />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse flex flex-col items-center">
            <span className="text-5xl font-brand tracking-wider drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)] opacity-90 bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-300 to-zinc-700">FightNet</span>
            <div className="h-1 w-32 bg-[#E31837] mt-4 rounded overflow-hidden">
              <div className="h-full bg-zinc-300 w-1/3 animate-[slide_1.5s_ease-in-out_infinite]" style={{ animationName: 'slide' }}></div>
            </div>
            <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={!currentUser ? <LandingPage /> : <Navigate to="/app" />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
