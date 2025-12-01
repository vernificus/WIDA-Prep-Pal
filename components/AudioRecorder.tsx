import React, { useState, useRef } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    setRecordedUrl(null);
    chunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        onRecordingComplete(blob);
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("We need microphone access to practice speaking!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {!isRecording && !recordedUrl && (
        <button
          onClick={startRecording}
          className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 border-4 border-red-200 shadow-xl flex items-center justify-center transition-all hover:scale-105"
          title="Start Recording"
        >
          <span className="text-4xl">🎙️</span>
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-400 shadow-xl flex items-center justify-center animate-pulse"
          title="Stop Recording"
        >
          <div className="w-8 h-8 bg-white rounded-sm"></div>
        </button>
      )}

      {recordedUrl && (
        <div className="flex flex-col items-center gap-3 w-full animate-fade-in">
          <audio src={recordedUrl} controls className="w-full max-w-sm" />
          <button
            onClick={startRecording}
            className="text-sm text-slate-500 underline hover:text-slate-800"
          >
            Record Again
          </button>
        </div>
      )}

      <p className="font-bold text-slate-600">
        {isRecording ? "Recording... Say your answer!" : recordedUrl ? "Listen to your answer" : "Tap the mic to speak"}
      </p>
    </div>
  );
};

export default AudioRecorder;
