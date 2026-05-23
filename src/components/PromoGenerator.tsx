import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Loader2, Play } from 'lucide-react';
import _ReactPlayer from 'react-player';
const ReactPlayer = _ReactPlayer as any;
import { GoogleGenAI } from '@google/genai';

interface PromoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  fighterName: string;
  initialPrompt?: string;
}

export function PromoGenerator({ isOpen, onClose, fighterName, initialPrompt }: PromoGeneratorProps) {
  const defaultPrompt = initialPrompt || `A cinematic promotional video of an MMA fighter named ${fighterName || 'The Contender'} training intensely in a dark, gritty gym. Neon lights.`;
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setPrompt(defaultPrompt);
      setVideoUri(null);
      setVideoBlobUrl(null);
      setError(null);
      setProgressStatus('');
    }
  }, [isOpen, defaultPrompt]);

  const generateVideo = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setVideoUri(null);
      setVideoBlobUrl(null);
      setProgressStatus('Initiating Veo generation...');

      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => null);
        throw new Error(errData?.error || `Failed to start video generation: ${startRes.statusText}`);
      }

      const { operationName } = await startRes.json();
      console.log('Video Generation started. Operation: ', operationName);

      let done = false;
      while (!done) {
        setProgressStatus('Rendering frames (this may take a few minutes)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName })
        });
        
        if (!statusRes.ok) {
          const errData = await statusRes.json().catch(() => null);
          throw new Error(errData?.error || `Failed to check status: ${statusRes.statusText}`);
        }
        
        const statusData = await statusRes.json();
        done = statusData.done;
      }

      setProgressStatus('Downloading video...');
      console.log('Video Generation complete. Operation: ', operationName);

      const downloadRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName })
      });

      if (!downloadRes.ok) {
         const errData = await downloadRes.json().catch(() => null);
         throw new Error(errData?.error || `Failed to download video: ${downloadRes.statusText}`);
      }

      const blob = await downloadRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      setVideoBlobUrl(objectUrl);
      setProgressStatus('');

    } catch (err: any) {
      console.error('Video generation error:', err);
      if (err.message && err.message.includes('GEMINI_API_KEY missing')) {
        setError('Missing GEMINI_API_KEY. Please set your Gemini API key in the platform settings to use Veo.');
      } else {
        setError(err.message || "An unexpected error occurred during video generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-black rounded-full hover:bg-zinc-800 transition border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8 pr-12">
              <h2 className="text-2xl font-black uppercase text-white flex items-center gap-3 italic tracking-tighter">
                <Video className="w-6 h-6 text-[#E31837]" />
                Veo Promo Generator
              </h2>
              <p className="text-zinc-400 text-sm mt-2 font-bold uppercase tracking-widest text-[10px]">Generate cinematic fight promos with Google's premier video model</p>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Cinematic Direction</label>
                 <textarea 
                   value={prompt}
                   onChange={e => setPrompt(e.target.value)}
                   disabled={isGenerating}
                   className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all resize-none h-32 leading-relaxed disabled:opacity-50"
                 />
               </div>

               {error && (
                 <div className="px-4 py-3 bg-red-950/40 border border-[#E31837]/50 text-[#E31837] text-[10px] uppercase font-black tracking-widest rounded-xl shadow-xl">
                   {error}
                 </div>
               )}

               {!videoBlobUrl && (
                 <button 
                   onClick={generateVideo}
                   disabled={isGenerating || !prompt.trim()}
                   className="w-full flex items-center justify-center gap-3 bg-white text-black font-black uppercase italic tracking-tighter text-sm px-10 py-5 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                 >
                   {isGenerating ? (
                     <>
                       <Loader2 className="w-5 h-5 animate-spin text-[#E31837]" />
                       Generator Active
                     </>
                   ) : (
                     <>
                       <Video className="w-5 h-5 group-hover:scale-110 transition-transform text-[#E31837]" />
                       Ignite Synthesis
                     </>
                   )}
                 </button>
               )}

               {isGenerating && (
                 <div className="text-center font-bold text-zinc-500 uppercase tracking-widest text-[10px] animate-pulse">
                   {progressStatus}
                 </div>
               )}

               {videoBlobUrl && (
                 <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/10 relative shadow-2xl">
                       {/* @ts-ignore */}
                       <ReactPlayer 
                         url={videoBlobUrl} 
                         width="100%"
                         height="100%"
                         controls 
                         playing 
                         loop 
                         playsinline
                       />
                       <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                           Veo Generated
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => setVideoBlobUrl(null)}
                         className="flex-1 bg-zinc-900 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-zinc-800 transition"
                       >
                         Generate Another
                       </button>
                       <a 
                         href={videoBlobUrl}
                         download={`${fighterName.replace(/\s+/g, '_')}_promo.mp4`}
                         className="flex-1 text-center bg-[#E31837] text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-red-700 transition shadow-xl shadow-red-900/20"
                       >
                         Download MP4
                       </a>
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
