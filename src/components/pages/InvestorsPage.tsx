import React, { useState } from 'react';
import { Landmark, Users, Heart, Target, TrendingUp, ShieldCheck, Zap, FileText, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export function InvestorsPage() {
  const [activeTab, setActiveTab] = useState<'facility' | 'platform' | 'social' | 'proposal' | 'brand'>('facility');

  return (
    <div className="p-4 md:p-8 space-y-12 bg-[#0a0a0a] min-h-full">
      <header className="mb-12 border-b border-[#222] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Landmark className="w-8 h-8 text-[#E31837]" />
          <h1 className="text-3xl font-black uppercase text-white tracking-tighter italic">Founding Partners & Investors</h1>
        </div>
        <p className="text-zinc-500 uppercase tracking-[0.3em] text-[10px] font-black">Seeding the Future of Southwest Louisiana Combat Arts</p>
      </header>

      {/* Hero / Vision Statement */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-black to-[#0c0c0c] border border-zinc-800 p-8 rounded-2xl group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Zap className="w-64 h-64 text-[#E31837]" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <h2 className="text-2xl font-black uppercase italic mb-4 text-white">The SWLA Hub Initiative</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            We are raising <span className="text-[#E31837] font-bold">$2.5M in Seed Funding</span> to establish the first dedicated <span className="text-white italic">FightNet Training & Recreation Center</span> in Southwest Louisiana. This is more than a gym; it's a community foundation built for disciplined adventure and the sustainable growth of combat athletes.
          </p>
          <div className="flex flex-wrap gap-4 font-mono text-[10px]">
            <div className="px-3 py-1 bg-[#E31837]/10 border border-[#E31837]/30 text-[#E31837] rounded font-bold uppercase tracking-widest">Target: Lake Charles</div>
            <div className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded font-bold uppercase tracking-widest">Exhibition Venue Included</div>
          </div>
        </div>
      </section>

      {/* Tabs / Navigation */}
      <div className="flex border-b border-zinc-800 gap-8 overflow-x-auto scrollbar-hide">
        {[
          { id: 'facility', label: 'THE FACILITY', icon: Landmark },
          { id: 'platform', label: 'PLATFORM FUNDING', icon: TrendingUp },
          { id: 'social', label: 'COMMUNITY IMPACT', icon: Users },
          { id: 'brand', label: 'BRAND & REGIONAL', icon: Zap },
          { id: 'proposal', label: 'THE PROPOSAL', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all relative shrink-0 ${
              activeTab === tab.id ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="nav_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E31837]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'facility' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 className="text-xl font-black italic uppercase text-white mb-6">The Recreation & Exhibition Venue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Heart className="w-6 h-6 text-[#E31837] mb-4" />
                  <h4 className="font-bold text-sm uppercase mb-2">Exhibition Center</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Exclusive spectating arena for FightNet partners. A space for "FightNet Fan/Fighter Collaboration" events, allowing direct local support for amateur and pro talent.
                  </p>
                </div>
                <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-[#E31837] mb-4" />
                  <h4 className="font-bold text-sm uppercase mb-2">High-Performance Lab</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    State-of-the-art recovery tools, film study rooms, and multi-disciplinary zones (BJJ, Striking, Wrestling) for the SWLA community.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'platform' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
               <h3 className="text-xl font-black italic uppercase text-white mb-6">Fighter Advocacy & Platform Growth</h3>
               <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                 Investment will scale the FightNet Agent Network. We aim to employ dedicated <span className="text-white italic">Fighter Advocates</span>—professionals who manage careers in a non-invasive, trustworthy manner, ensuring local fighters get the exposure and contracts they deserve.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded">
                    <h4 className="font-bold text-xs uppercase text-[#E31837] mb-2 tracking-widest">Media Exposure</h4>
                    <p className="text-[10px] text-zinc-500">Advocates produce high-quality media content reflecting each fighter's unique style to maximize fan engagement.</p>
                 </div>
                 <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded">
                    <h4 className="font-bold text-xs uppercase text-[#E31837] mb-2 tracking-widest">Pro Bridge</h4>
                    <p className="text-[10px] text-zinc-500">Creating the essential link between amateur success and major league opportunities (UFC, Bellator).</p>
                 </div>
               </div>
               <div className="bg-[#0c0c0c] border border-zinc-800 p-6 rounded-lg">
                 <h4 className="font-bold text-xs uppercase text-zinc-500 mb-4 tracking-widest">Allocation Strategy</h4>
                 <ul className="space-y-4">
                   <li className="flex items-center justify-between border-b border-zinc-800 pb-2">
                     <span className="text-sm font-bold text-white uppercase italic">Agent Recruitment</span>
                     <span className="font-mono text-[#E31837]">$750k</span>
                   </li>
                   <li className="flex items-center justify-between border-b border-zinc-800 pb-2">
                     <span className="text-sm font-bold text-white uppercase italic">Legal & Compliance</span>
                     <span className="font-mono text-[#E31837]">$300k</span>
                   </li>
                   <li className="flex items-center justify-between border-b border-zinc-800 pb-2">
                     <span className="text-sm font-bold text-white uppercase italic">Digital Infrastructure</span>
                     <span className="font-mono text-[#E31837]">$450k</span>
                   </li>
                 </ul>
               </div>
            </motion.div>
          )}

          {activeTab === 'social' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="text-xl font-black italic uppercase text-white mb-4">The Case for Social Investment</h3>
              <div className="p-8 bg-white text-black rounded-lg">
                <h4 className="text-lg font-black uppercase mb-4 leading-tight italic">Why a Non-Profit Model?</h4>
                <div className="space-y-6">
                  <div className="border-l-4 border-zinc-900 pl-4">
                    <p className="font-bold text-sm uppercase mb-1 underline">Digital Detox & Screen Time</p>
                    <p className="text-xs leading-relaxed">
                      Children and families are increasingly isolated by screens. Our center serves as a "Disciplined Adventure" playground, replacing sedentary behavior with active, healthy community collaboration.
                    </p>
                  </div>
                  <div className="border-l-4 border-zinc-900 pl-4">
                    <p className="font-bold text-sm uppercase mb-1 underline">Youth Character Architecture</p>
                    <p className="text-xs leading-relaxed">
                      Combat arts teach discipline, respect, and resilience. By removing the financial barriers through non-profit funding, we invite every family in SWLA to participate in character growth.
                    </p>
                  </div>
                  <div className="border-l-4 border-zinc-900 pl-4">
                    <p className="font-bold text-sm uppercase mb-1 underline">Active Community Appreciation</p>
                    <p className="text-xs leading-relaxed">
                      This isn't just about fighting; it's an appreciation for the 'Arts'. We cultivate a culture where the community collaborates on health and self-improvement rather than just passive consumption.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'brand' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <h3 className="text-xl font-black italic uppercase text-white mb-4">Regional Powerhouse & Brand ROI</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-[#E31837] mb-4" />
                  <h4 className="font-black text-xs uppercase mb-2 tracking-widest text-white">Regional Development</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed uppercase">
                    西南 LA (SWLA) is an untapped goldmine for combat sports. By centralizing the region's elite trainers and gyms under the FightNet umbrella, we create an economic engine that draws spectators from across the Gulf Coast.
                  </p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-[#E31837] mb-4" />
                  <h4 className="font-black text-xs uppercase mb-2 tracking-widest text-white">Trend-Setting Brand</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed uppercase">
                    FightNet isn't just a platform; it's a high-end lifestyle brand. From exclusive "Founding Partner" merchandise to premium exhibition hosting, we are setting the aesthetic and cultural standard for modern MMA.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/50 p-8 rounded-xl border border-zinc-800">
                <h4 className="text-sm font-black uppercase text-white mb-6 italic tracking-widest">The "Powerhouse" Revenue Model</h4>
                <div className="space-y-4">
                  {[
                    { title: 'Exclusive Hosting', desc: 'Premium exhibition events for the FightNet community.' },
                    { title: 'High-End Merchandise', desc: 'Trend-setting apparel and athlete performance gear.' },
                    { title: 'Corporate Training', desc: 'Disciplined leadership programs for regional executives.' },
                    { title: 'Media Rights', desc: 'Ownership of high-production media assets from our "Advocates".' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start border-b border-zinc-800 pb-4">
                      <div className="w-8 h-8 rounded-full bg-[#E31837]/20 flex items-center justify-center shrink-0">
                        <span className="text-[#E31837] font-mono text-xs">{idx + 1}</span>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black uppercase text-white mb-1">{item.title}</h5>
                        <p className="text-[10px] text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'proposal' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <h3 className="text-xl font-black italic uppercase text-white mb-4">The Future Assets Proposal</h3>
              
              <div className="space-y-6">
                <div className="p-6 bg-zinc-900 border-l-4 border-[#E31837] rounded-r-lg">
                  <h4 className="text-sm font-black uppercase text-white mb-3 tracking-widest flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-[#E31837]" />
                    Phase 1: The Platform Asset (Digital Scalability)
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed uppercase">
                    FightNet operates as a digital-first career intelligence layer. Our primary digital assets include a proprietary matchmaking engine, a verified record database, and a centralized talent portal currently bridging over <span className="text-white">500 active amateur athletes</span> in the Gulf Coast region. This is the foundation for global expansion.
                  </p>
                </div>

                <div className="p-6 bg-zinc-900 border-l-4 border-[#E31837] rounded-r-lg">
                  <h4 className="text-sm font-black uppercase text-white mb-3 tracking-widest flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-[#E31837]" />
                    Phase 2: The Physical Asset (SWLA Regional Flagship)
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed uppercase">
                    A 15,000 sq ft non-profit facility designed for hybrid use: youth development by day, professional training and exhibition by night. This asset will serve as the <span className="text-white italic">exclusive scouting ground</span> for major MMA organizations partnering with FightNet, anchoring the brand in the heart of Southwest Louisiana.
                  </p>
                </div>

                <div className="p-6 bg-zinc-900 border-l-4 border-[#E31837] rounded-r-lg">
                  <h4 className="text-sm font-black uppercase text-white mb-3 tracking-widest flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-[#E31837]" />
                    Phase 3: The Multifaceted Revenue Engine
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed uppercase">
                    We are building a trend-setting powerhouse. By integrating <span className="text-white">Hosting, Elite Gym Operations, Professional Trainers, Merchandise, and Exhibition rights</span>, we create a self-sustaining ecosystem. Our "Advocates" manage the media bridge, ensuring amateur-to-pro transitions result in high-value mainstream contracts.
                  </p>
                </div>

                <div className="bg-[#E31837]/5 border border-[#E31837]/20 p-8 rounded-lg">
                  <h4 className="text-lg font-black uppercase italic text-white mb-4">The "Full Funding" Conviction</h4>
                  <p className="text-sm text-zinc-300 italic mb-4">"Disciplined adventure is the antidote to the digital vacuum."</p>
                  <p className="text-xs text-zinc-500 leading-relaxed uppercase">
                    A fully funded recreation center removes the "pay-to-play" barrier that keeps low-income families trapped behind screens. By investing in physical adventure and the martial arts, we are engineering a more active, collaborative, and appreciative community architecture. This regional development creates a high-end brand legacy that attracts <span className="text-[#E31837]">UFC and Bellator</span> caliber partnerships, positioning SWLA as the premier combat arts hub of the South.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar / CTA */}
        <aside className="space-y-6">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-lg">
            <h4 className="font-black uppercase text-xs text-white mb-4 italic tracking-tighter">Investment Contact</h4>
            <div className="space-y-4">
              <button className="w-full bg-[#E31837] text-white py-3 text-[10px] font-black uppercase tracking-widest rounded hover:bg-red-700 transition">Request Prospectus</button>
              <button className="w-full border border-zinc-700 text-zinc-400 py-3 text-[10px] font-black uppercase tracking-widest rounded hover:border-white hover:text-white transition">Schedule Meeting</button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
             <div className="flex items-center gap-2 mb-4 text-[#E31837]">
               <Target className="w-4 h-4" />
               <h4 className="font-black uppercase text-[10px] tracking-widest">Key Areas</h4>
             </div>
             <ul className="text-[10px] font-bold uppercase space-y-2 text-zinc-500">
               <li>• Lake Charles HQ</li>
               <li>• Lafayette Training Hub</li>
               <li>• SWLA Mobile Outreach</li>
               <li>• Youth Scholarship Fund</li>
             </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
