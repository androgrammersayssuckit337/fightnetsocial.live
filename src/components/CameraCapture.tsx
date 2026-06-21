import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } } 
      });
      setStream(mediaStream);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions or use image upload.");
    }
  }, [stream]);

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Run once on mount

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // Make canvas square
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Crop the center
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
  };

  const handleApprove = () => {
    if (capturedDataUrl) {
      // Convert data URL to Blob
      fetch(capturedDataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col relative shadow-2xl">
         <div className="p-4 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
             <Camera className="w-4 h-4 text-[#E31837]" /> Camera Capture
           </h3>
           <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors p-1 bg-zinc-900 rounded-full">
             <X className="w-4 h-4" />
           </button>
         </div>

         <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
           {error ? (
             <div className="text-zinc-500 text-xs text-center p-6 italic">{error}</div>
           ) : capturedDataUrl ? (
             <img src={capturedDataUrl} alt="Captured" className="w-full h-full object-cover" />
           ) : (
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               className="w-full h-full object-cover scale-x-[-1]" 
             />
           )}
           <canvas ref={canvasRef} className="hidden" />
         </div>

         <div className="p-6 flex items-center justify-center gap-4 border-t border-white/5 bg-zinc-900/50">
           {capturedDataUrl ? (
             <>
               <motion.button 
                 whileHover={{ scale: 1.05 }} 
                 whileTap={{ scale: 0.95 }}
                 onClick={handleRetake} 
                 className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-bold uppercase hover:bg-zinc-800 flex items-center justify-center gap-2"
               >
                 <RefreshCw className="w-4 h-4" /> Retake
               </motion.button>
               <motion.button 
                 whileHover={{ scale: 1.05 }} 
                 whileTap={{ scale: 0.95 }}
                 onClick={handleApprove} 
                 className="flex-1 py-3 px-4 rounded-xl bg-[#E31837] text-white text-xs font-bold uppercase hover:bg-red-600 shadow-[0_0_15px_rgba(227,24,55,0.4)] flex items-center justify-center gap-2"
               >
                 <Check className="w-4 h-4" /> Use Photo
               </motion.button>
             </>
           ) : (
             <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                onClick={handleCapture}
                disabled={!!error}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-black hover:bg-white/10 transition-colors disabled:opacity-50"
             >
                <div className="w-12 h-12 rounded-full bg-white transition-transform hover:scale-95" />
             </motion.button>
           )}
         </div>
      </div>
    </div>
  );
}
