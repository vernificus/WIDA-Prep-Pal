import React, { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioData: ArrayBuffer | null;
  autoPlay?: boolean;
  label?: string;
  compact?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioData, 
  autoPlay = false,
  label = "Listen to Question",
  compact = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (audioData) {
      // The Gemini TTS model returns raw PCM data at 24kHz.
      // decodeAudioData requires file headers (WAV/MP3), so we must decode manually.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      
      try {
        // Create a view of the raw audio data as 16-bit integers
        const pcmData = new Int16Array(audioData);
        
        // Gemini TTS sample rate is 24000Hz
        const sampleRate = 24000;
        
        // Create an AudioBuffer (mono)
        const buffer = ctx.createBuffer(1, pcmData.length, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        // Convert Int16 PCM to Float32 [-1.0, 1.0] for the AudioBuffer
        for (let i = 0; i < pcmData.length; i++) {
          // Normalize 16-bit integer to float
          channelData[i] = pcmData[i] / 32768.0;
        }

        setDecodedBuffer(buffer);
      } catch (err) {
        console.error("Error processing PCM audio data:", err);
      }

      return () => {
        if (ctx.state !== 'closed') {
          ctx.close();
        }
      };
    }
  }, [audioData]);

  const playAudio = async () => {
    if (!audioContext || !decodedBuffer) return;

    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Stop previous instance if playing
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch(e) {
        // ignore
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(audioContext.destination);
    source.onended = () => setIsPlaying(false);
    
    sourceNodeRef.current = source;
    source.start();
    setIsPlaying(true);
  };

  useEffect(() => {
    if (autoPlay && decodedBuffer && !isPlaying) {
      playAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedBuffer]);

  return (
    <div className={`flex justify-center ${compact ? 'my-1' : 'my-4'}`}>
      <button
        onClick={playAudio}
        disabled={!decodedBuffer}
        className={`
          flex items-center gap-2 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95
          ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-lg'}
          ${isPlaying ? 'bg-orange-400 ring-4 ring-orange-200' : 'bg-sky-500 hover:bg-sky-600'}
          ${!decodedBuffer ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isPlaying ? (
          <>
            <span className="animate-pulse">🔊</span> {compact ? 'Playing...' : 'Playing...'}
          </>
        ) : (
          <>
            <span>▶️</span> {label}
          </>
        )}
      </button>
    </div>
  );
};

export default AudioPlayer;