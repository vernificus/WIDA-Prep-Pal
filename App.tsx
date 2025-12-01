import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Loading from './components/Loading';
import AudioPlayer from './components/AudioPlayer';
import AudioRecorder from './components/AudioRecorder';
import { Domain, GradeCluster, QuestionData, FeedbackData } from './types';
import { generateQuestion, evaluateSubmission, generateSpeech } from './services/geminiService';

// --- Sub-components for Screens ---

const SelectorScreen: React.FC<{
  onSelect: (d: Domain, g: GradeCluster) => void;
}> = ({ onSelect }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeCluster>(GradeCluster.G2_3);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-slate-100">
        <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span>🎓</span> Pick your Grade Level
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {Object.values(GradeCluster).map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`py-3 px-2 rounded-xl border-2 font-bold text-sm sm:text-base transition-all ${
                selectedGrade === g
                  ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm transform scale-105'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-slate-100">
        <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span>🚀</span> Choose a Skill
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => onSelect(Domain.LISTENING, selectedGrade)} className="group relative overflow-hidden bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 p-6 rounded-2xl text-left transition-all">
            <span className="text-3xl block mb-2">👂</span>
            <span className="text-xl font-bold text-blue-800">Listening</span>
            <p className="text-sm text-blue-600 mt-1">Listen to stories and answer.</p>
          </button>
          
          <button onClick={() => onSelect(Domain.READING, selectedGrade)} className="group relative overflow-hidden bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 p-6 rounded-2xl text-left transition-all">
            <span className="text-3xl block mb-2">📚</span>
            <span className="text-xl font-bold text-green-800">Reading</span>
            <p className="text-sm text-green-600 mt-1">Read text and find answers.</p>
          </button>
          
          <button onClick={() => onSelect(Domain.SPEAKING, selectedGrade)} className="group relative overflow-hidden bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 hover:border-orange-400 p-6 rounded-2xl text-left transition-all">
            <span className="text-3xl block mb-2">🗣️</span>
            <span className="text-xl font-bold text-orange-800">Speaking</span>
            <p className="text-sm text-orange-600 mt-1">Record your voice.</p>
          </button>
          
          <button onClick={() => onSelect(Domain.WRITING, selectedGrade)} className="group relative overflow-hidden bg-pink-50 hover:bg-pink-100 border-2 border-pink-200 hover:border-pink-400 p-6 rounded-2xl text-left transition-all">
            <span className="text-3xl block mb-2">✍️</span>
            <span className="text-xl font-bold text-pink-800">Writing</span>
            <p className="text-sm text-pink-600 mt-1">Write short paragraphs.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [screen, setScreen] = useState<'home' | 'loading' | 'practice' | 'feedback'>('home');
  const [domain, setDomain] = useState<Domain>(Domain.READING);
  const [grade, setGrade] = useState<GradeCluster>(GradeCluster.G2_3);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | Blob | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [ttsAudio, setTtsAudio] = useState<ArrayBuffer | null>(null);
  const [loadingTts, setLoadingTts] = useState(false);

  const startPractice = async (d: Domain, g: GradeCluster) => {
    setDomain(d);
    setGrade(g);
    setScreen('loading');
    setTtsAudio(null);
    setUserAnswer(null);
    setFeedback(null);
    setLoadingTts(false);

    try {
      const q = await generateQuestion(d, g);
      setQuestion(q);

      if (d === Domain.LISTENING) {
        // Generate audio for the prompt
        const audioBuffer = await generateSpeech(`${q.promptText} ... ${q.questionText}`);
        setTtsAudio(audioBuffer);
      }
      
      setScreen('practice');
    } catch (e) {
      alert("Oops! Something went wrong creating the question. Try again.");
      setScreen('home');
    }
  };

  const handlePlayScenario = async () => {
    if (!question) return;
    setLoadingTts(true);
    try {
      const audio = await generateSpeech(question.promptText);
      setTtsAudio(audio);
    } catch (e) {
      alert("Unable to generate audio right now.");
    } finally {
      setLoadingTts(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !userAnswer) return;
    setScreen('loading');
    
    try {
      const fb = await evaluateSubmission(question, userAnswer, domain, grade);
      setFeedback(fb);
      setScreen('feedback');
    } catch (e) {
      alert("Could not grade answer. Please try again.");
      setScreen('practice');
    }
  };

  const handleNext = () => {
    startPractice(domain, grade);
  };

  return (
    <Layout onHome={() => setScreen('home')}>
      {screen === 'home' && <SelectorScreen onSelect={startPractice} />}

      {screen === 'loading' && (
        <Loading 
          message={question ? "Checking your answer..." : "Creating a fun challenge with a picture..."} 
        />
      )}

      {screen === 'practice' && question && (
        <div className="space-y-6 animate-fade-in pb-12">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider 
                ${domain === Domain.LISTENING ? 'bg-blue-100 text-blue-700' : 
                  domain === Domain.READING ? 'bg-green-100 text-green-700' :
                  domain === Domain.SPEAKING ? 'bg-orange-100 text-orange-700' : 
                  'bg-pink-100 text-pink-700'}`}>
                {domain} • {grade}
              </span>
            </div>

            {/* Image Display */}
            {question.imageUrl && (
              <div className="flex justify-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <img 
                  src={question.imageUrl} 
                  alt="Question Context" 
                  className="rounded-lg shadow-sm max-h-64 object-contain"
                />
              </div>
            )}

            {/* Prompt Content */}
            {domain === Domain.LISTENING ? (
              <div className="text-center py-4">
                <p className="text-slate-500 mb-4 italic">Listen to the story carefully!</p>
                <div className="bg-blue-50 p-6 rounded-3xl inline-block mb-4">
                    <span className="text-6xl">🎧</span>
                </div>
                <AudioPlayer audioData={ttsAudio} autoPlay={false} />
              </div>
            ) : (
              <div className="prose prose-lg text-slate-800 bg-slate-50 p-6 rounded-xl border-l-4 border-sky-400">
                <p className="whitespace-pre-wrap font-medium text-lg leading-relaxed">{question.promptText}</p>
                
                {/* TTS Option for scenarios */}
                <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
                  {!ttsAudio ? (
                    <button 
                      onClick={handlePlayScenario}
                      disabled={loadingTts}
                      className="flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      {loadingTts ? (
                         <>
                           <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                           Loading Audio...
                         </>
                      ) : (
                         <>🔊 Listen to Scenario</>
                      )}
                    </button>
                  ) : (
                    <AudioPlayer 
                      audioData={ttsAudio} 
                      autoPlay={true} 
                      compact={true} 
                      label="Listen to Scenario" 
                    />
                  )}
                </div>
              </div>
            )}
            
            <h3 className="text-xl font-bold text-slate-800 mt-6 mb-2">
              {question.questionText}
            </h3>
          </div>

          {/* Input Area */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-100">
            <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wide">
              Your Answer
            </h4>

            {(domain === Domain.READING || domain === Domain.LISTENING) && question.options && (
              <div className="grid gap-3">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserAnswer(opt)}
                    className={`p-4 rounded-xl text-left font-medium transition-all border-2 text-lg
                      ${userAnswer === opt 
                        ? 'bg-sky-100 border-sky-500 text-sky-900 shadow-md transform scale-[1.01]' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-sky-300'}`}
                  >
                    <span className="inline-block w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-center leading-7 mr-3 text-sm font-bold text-slate-400 group-hover:border-sky-400">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {domain === Domain.WRITING && (
              <textarea
                className="w-full h-48 p-4 rounded-xl border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none resize-none text-lg text-slate-700 placeholder:text-slate-300"
                placeholder="Type your answer here..."
                onChange={(e) => setUserAnswer(e.target.value)}
                value={typeof userAnswer === 'string' ? userAnswer : ''}
              />
            )}

            {domain === Domain.SPEAKING && (
              <AudioRecorder onRecordingComplete={(blob) => setUserAnswer(blob)} />
            )}

            <div className="mt-8 flex justify-end">
              <button
                disabled={!userAnswer}
                onClick={handleSubmit}
                className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-sky-200 transition-all active:scale-95 text-lg flex items-center gap-2"
              >
                Submit Answer <span>✨</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'feedback' && feedback && (
        <div className="space-y-6 animate-slide-up pb-12">
           <div className={`p-8 rounded-3xl shadow-xl text-center border-b-8
             ${feedback.score >= 4 
               ? 'bg-green-50 border-green-200' 
               : 'bg-yellow-50 border-yellow-200'}`}>
              
              <div className="text-6xl mb-4 animate-bounce">
                {feedback.score >= 4 ? '🌟' : '💪'}
              </div>
              
              <h2 className={`text-3xl font-bold font-comic mb-4
                ${feedback.score >= 4 ? 'text-green-700' : 'text-yellow-700'}`}>
                 {feedback.score >= 4 ? "Awesome Work!" : "Good Try!"}
              </h2>
              
              <p className="text-xl text-slate-700 mb-6 font-medium">
                {feedback.feedbackText}
              </p>

              {feedback.corrections && (
                <div className="bg-white/60 p-4 rounded-xl inline-block text-left max-w-md">
                   <p className="text-sm font-bold text-slate-500 uppercase mb-1">Tip for next time:</p>
                   <p className="text-slate-800">{feedback.corrections}</p>
                </div>
              )}
           </div>

           <div className="flex justify-center gap-4">
             <button
               onClick={() => setScreen('home')}
               className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
             >
               Pick New Topic
             </button>
             <button
               onClick={handleNext}
               className="px-8 py-3 rounded-xl font-bold bg-sky-500 text-white shadow-lg shadow-sky-200 hover:bg-sky-600 transition-transform active:scale-95"
             >
               Next Question ➡️
             </button>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;