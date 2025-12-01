import React from 'react';

const Loading: React.FC<{ message?: string }> = ({ message = "Thinking..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
          🤖
        </div>
      </div>
      <p className="text-xl font-bold text-sky-600 animate-pulse">{message}</p>
    </div>
  );
};

export default Loading;
