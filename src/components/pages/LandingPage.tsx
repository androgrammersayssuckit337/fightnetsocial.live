import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Users, Crown } from 'lucide-react';

export function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (role: 'fighter' | 'fan' | 'sponsor') => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle(role);
    } catch (error: any) {
      if (error.message === 'LOGIN_CANCELLED') {
        setErrorMsg('Login cancelled. Please try again.');
      } else {
        setErrorMsg('Authentication failed. Please check your connection or try another browser.');
        console.error(error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col font-sans">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-0 opacity-20 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] ease-linear scale-110"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/90 to-[#0a0a0a]"></div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="p-6 md:px-12 md:py-8 flex justify-between items-center z-20">
          <div className="tracking-tighter text-2xl md:text-3xl text-[#E31837] italic font-black">
            FIGHTNET
          </div>
          <button 
            onClick={() => handleLogin('fan')}
            className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </header>

        {/* Hero Content */}
        <main className="flex-1 flex flex-col justify-center items-center text-center px-4 max-w-5xl mx-auto w-full z-10">
          <h1 className="font-display text-5xl md:text-8xl lg:text-[11rem] leading-[0.8] tracking-tighter uppercase mb-6">
            <span className="block text-white">More Than a Platform.</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-[#E31837] to-red-900" style={{ WebkitTextStroke: '1px rgba(227,24,55,0.3)' }}>
              It's Your Path.
            </span>
          </h1>
          
          <p className="text-sm md:text-lg font-bold uppercase tracking-widest text-zinc-400 mb-2">
            Get Seen. Get Connected. <span className="text-[#E31837]">Get Ahead.</span>
          </p>
          <p className="text-zinc-500 max-w-2xl text-xs md:text-sm tracking-wide">
            The all-in-one media platform and career development bridge built specifically for semi-pro MMA fighters.
          </p>

          {errorMsg && (
            <div className="mt-8 px-4 py-2 bg-red-900/20 border border-[#E31837]/30 text-[#E31837] text-[10px] uppercase font-bold tracking-widest rounded animate-pulse">
              {errorMsg}
            </div>
          )}

          {/* Role Selection */}
          <div className="mt-16 w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-px bg-[#222] border border-[#222]">
            <button 
              onClick={() => handleLogin('fighter')}
              disabled={isLoggingIn}
              className="group relative overflow-hidden bg-[#0c0c0c] p-8 flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Shield className="w-8 h-8 text-[#E31837] mb-4 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <h3 className="font-black text-lg tracking-tight uppercase">For Fighters</h3>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Join the Roster</p>
              </div>
            </button>

            <button 
              onClick={() => handleLogin('sponsor')}
              disabled={isLoggingIn}
              className="group relative overflow-hidden bg-[#0c0c0c] p-8 flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Crown className="w-8 h-8 text-[#E31837] mb-4 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <h3 className="font-black text-lg tracking-tight uppercase">For Sponsors</h3>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Find Talent</p>
              </div>
            </button>

            <button 
              onClick={() => handleLogin('fan')}
              disabled={isLoggingIn}
              className="group relative overflow-hidden bg-[#0c0c0c] p-8 flex flex-col items-center justify-center hover:bg-zinc-900 transition-colors disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#E31837]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Users className="w-8 h-8 text-[#E31837] mb-4 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <h3 className="font-black text-lg tracking-tight uppercase">For Fans</h3>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Watch the Future</p>
              </div>
            </button>
          </div>
        </main>
        
        {/* Footer info bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#222] border-t border-[#222] mt-12 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600">
           <div className="bg-[#0a0a0a] py-4 hover:text-white transition-colors">Media Platform</div>
           <div className="bg-[#0a0a0a] py-4 hover:text-white transition-colors">Career Bridge</div>
           <div className="bg-[#0a0a0a] py-4 hover:text-white transition-colors">Advocate Agents</div>
           <div className="bg-[#0a0a0a] py-4 hover:text-white transition-colors">Social Growth</div>
        </div>
      </div>
    </div>
  );
}
