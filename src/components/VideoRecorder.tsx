import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, Video, X } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoRecorderProps {
  onVideoRecorded: (file: File) => void;
  onCancel: () => void;
}

export function VideoRecorder({ onVideoRecorded, onCancel }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
      } catch (e1) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
        } catch (e2) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
        }
      }

      setStream(mediaStream);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = () => {
    if (!stream) return;
    setRecordedChunks([]);
    
    let options: MediaRecorderOptions = {};
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }
    }

    const mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };
    
    mediaRecorder.onstop = () => {
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    // When recording stops and we have chunks, we can create the file.
    // Wait, it's better to process it in onstop or just observe recordedChunks when not recording.
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' });
      stopCamera();
      onVideoRecorded(file);
    }
  }, [isRecording, recordedChunks]);


  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black border border-[#E31837]/30 rounded-xl overflow-hidden relative"
    >
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button 
          onClick={() => { stopCamera(); onCancel(); }}
          className="bg-black/50 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-black/80 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {hasPermission === false ? (
        <div className="p-8 text-center text-zinc-400 min-h-64 flex flex-col items-center justify-center gap-4">
          <Camera className="w-12 h-12 text-zinc-600" />
          <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">Camera or microphone access denied or unavailable on this device.</p>
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs mt-2">
            <button 
              onClick={() => startCamera()} 
              className="flex-1 py-2 px-3 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-bold uppercase hover:bg-zinc-800 transition-colors"
            >
              Retry Camera
            </button>
            <label className="flex-1 py-2 px-3 rounded-lg bg-[#E31837] text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors cursor-pointer text-center">
              Upload Video
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onVideoRecorded(e.target.files[0]);
                  }
                }} 
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="relative bg-zinc-900 aspect-video flex items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                className="w-14 h-14 bg-[#E31837] rounded-full flex items-center justify-center border-4 border-white hover:scale-110 transition-transform shadow-xl shadow-red-900/50"
              >
                <Video className="w-6 h-6 text-white" />
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-4 border-[#E31837] hover:scale-110 transition-transform animate-pulse"
              >
                <StopCircle className="w-8 h-8 text-[#E31837]" />
              </button>
            )}
          </div>
          
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-red-500/30">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
              <span className="text-xs font-black uppercase tracking-widest text-white">Recording</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
