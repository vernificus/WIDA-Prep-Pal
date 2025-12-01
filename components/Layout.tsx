import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onHome: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHome }) => {
  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center">
      <header className="w-full bg-white border-b-4 border-sky-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
            <div className="bg-yellow-400 p-2 rounded-full border-2 border-yellow-500">
              🦁
            </div>
            <h1 className="text-2xl font-bold text-sky-600 font-comic tracking-wide">
              WIDA Prep Pal
            </h1>
          </div>
          <button 
            onClick={onHome}
            className="text-sm font-bold text-sky-500 hover:text-sky-700 hover:bg-sky-50 px-3 py-1 rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>
      </header>
      <main className="w-full max-w-3xl p-4 flex-grow flex flex-col">
        {children}
      </main>
      <footer className="w-full text-center p-6 text-slate-400 text-sm">
        Powered by Google Gemini • Built for Learning
      </footer>
    </div>
  );
};

export default Layout;
