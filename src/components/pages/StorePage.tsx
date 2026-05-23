import React from 'react';
import { ShoppingCart } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: 1, name: 'Dark Anime Double-Layer Shorts', price: '$45.00', img: '/images/anime_shorts.jpg', tag: 'BEST SELLER' },
  { id: 2, name: 'Strive Tribal MMA Shorts', price: '$40.00', img: '/images/tribal_shorts.jpg', tag: 'NEW' },
  { id: 3, name: 'MMA Grappling Gloves (Assorted Colors)', price: '$35.00', img: '/images/grappling_gloves.jpg' },
  { id: 4, name: 'Gingpai Boxing Gloves', price: '$45.99', img: '/images/boxing_gloves.jpg' },
  { id: 5, name: 'Skeleton Bone Hand MMA Gloves', price: '$39.99', img: '/images/skeleton_gloves.jpg', tag: 'HOT' },
  { id: 6, name: 'Curved Focus Punching Mitts', price: '$29.99', img: '/images/focus_mitts.jpg' },
  { id: 7, name: 'Metal Hand Grip Strengthener Set (50-250lb)', price: '$49.99', img: '/images/grip_strengtheners.jpg' },
  { id: 8, name: '4-Piece MMA Mouth Guard Set', price: '$15.99', img: '/images/mouth_guards.jpg' },
  { id: 9, name: 'Speed Jump Rope with Weighted Handles', price: '$24.99', img: '/images/jump_rope.jpg' }
];

export function StorePage() {
  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 flex justify-between items-end border-b border-[#222] pb-4">
        <div>
          <h1 className="text-4xl font-brand tracking-wider text-zinc-200 drop-shadow-[0_2px_2px_rgba(227,24,55,0.8)] mb-1">FightNet Gear</h1>
          <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Wear the movement. Built for the grind.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#E31837] text-white px-4 py-2 text-[10px] rounded font-bold uppercase tracking-widest hover:bg-red-700 transition-colors">
          <ShoppingCart className="w-4 h-4" /> Cart (0)
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_PRODUCTS.map(product => (
          <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden group flex flex-col justify-between hover:border-zinc-600 cursor-pointer transition-colors">
             <div className="relative aspect-square bg-[#050505] overflow-hidden flex items-center justify-center">
               <img src={product.img} alt={product.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 grayscale group-hover:grayscale-0 mix-blend-luminosity hover:mix-blend-normal" />
               {product.tag && (
                 <div className="absolute top-2 left-2 bg-[#E31837] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest z-10">
                   {product.tag}
                 </div>
               )}
             </div>
             
             <div className="p-4">
               <h3 className="font-bold text-sm text-white uppercase tracking-tight leading-none mb-1">{product.name}</h3>
               <p className="font-mono text-xs text-zinc-500">{product.price}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
