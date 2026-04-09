/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

import { ChevronDown, Sword } from 'lucide-react';
import Game from './components/Game';

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing'>('start');
  const tavernMusicRef = useRef<HTMLAudioElement>(null);
  const hasUserInteracted = useRef(false);
  const [musicVolume, setMusicVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.5;
    const stored = window.localStorage.getItem('hathul-music-volume');
    return stored === null ? 0.5 : parseFloat(stored);
  });
  const [showVolumeModal, setShowVolumeModal] = useState(false);

  useEffect(() => {
    if (!tavernMusicRef.current) return;

    const volumeMultiplier = musicVolume <= 0.5
      ? musicVolume * 0.3
      : 0.15 + (musicVolume - 0.5) * 0.7;
    tavernMusicRef.current.volume = volumeMultiplier;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hathul-music-volume', musicVolume.toString());
    }

    if (gameState === 'start') {
      const timer = window.setTimeout(() => {
        tavernMusicRef.current?.play().catch(() => {});
      }, 200);
      return () => window.clearTimeout(timer);
    }

    tavernMusicRef.current.pause();
  }, [gameState, musicVolume]);

  useEffect(() => {
    const onUserInteraction = () => {
      hasUserInteracted.current = true;
      if (tavernMusicRef.current) {
        tavernMusicRef.current.muted = false;
        tavernMusicRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', onUserInteraction, { once: true });
    window.addEventListener('keydown', onUserInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
    };
  }, []);

  if (gameState === 'playing') {
    return <Game onExit={() => setGameState('start')} musicVolume={musicVolume} setMusicVolume={setMusicVolume} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center p-6 text-center">
        {/* Header with Music Volume Control */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => {
              hasUserInteracted.current = true;
              if (tavernMusicRef.current) {
                tavernMusicRef.current.muted = false;
                tavernMusicRef.current.play().catch(() => {});
              }
              setShowVolumeModal(true);
            }}
            className="text-xs px-3 py-1 rounded-full border border-amber-500 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors"
          >
            Music {Math.round(musicVolume * 100)}%
          </button>
        </div>

        {/* Volume Control Modal */}
        {showVolumeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVolumeModal(false)}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900/95 border border-zinc-800 rounded-xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
            >
              <h3 className="font-serif text-2xl text-amber-200 text-center">Music Volume</h3>
              
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                  className="w-full h-3 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                  style={{
                    WebkitAppearance: 'slider-horizontal',
                  }}
                />
                <div className="text-center text-amber-200 font-semibold text-lg">
                  {Math.round(musicVolume * 100)}%
                </div>
              </div>

              <button
                onClick={() => setShowVolumeModal(false)}
                className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-lg font-serif text-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 opacity-80 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center gap-8">
          {/* Splash Image */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-64 sm:w-96 max-w-full relative drop-shadow-[0_0_40px_rgba(0,0,0,0.5)]"
          >
            <img 
              src="/images/elements/splash.png" 
              alt="Hathul Splash"
              className="w-full h-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-2"
          >
            <h1 className="text-6xl sm:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 drop-shadow-sm">
              Hathul
            </h1>
            <p className="text-amber-700/80 font-serif tracking-widest uppercase text-sm sm:text-base">
              A Roll of Fate
            </p>
          </motion.div>

          {/* Start Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGameState('playing')}
            className="group relative px-8 py-4 bg-zinc-900 border border-amber-900/50 hover:border-amber-500/50 rounded-sm overflow-hidden transition-colors cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-transparent to-amber-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-3 font-serif text-xl text-amber-500 group-hover:text-amber-400 transition-colors">
              <Sword className="w-5 h-5" />
              Start New Game
              <Sword className="w-5 h-5 scale-x-[-1]" />
            </span>
          </motion.button>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-600"
        >
          <span className="text-xs font-serif tracking-widest uppercase">Scroll for Rules</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Rules Section */}
      <section className="min-h-screen bg-zinc-950 py-24 px-6 relative border-t border-zinc-900">
        <div className="max-w-2xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-serif text-amber-600">The Rules of Hathul</h2>
            <div className="w-24 h-px bg-amber-900/50 mx-auto" />
          </div>

          <div className="prose prose-invert prose-amber mx-auto font-sans text-zinc-400 leading-relaxed space-y-6">
            <p>
              Welcome, brave adventurer, to Hathul—a high-stakes, low-morality D&D mini-game.
            </p>
            <p>
              The premise is simple: You and a goblin are taking turns swinging at a poor, defenseless cat. Why? Don't ask questions, just roll the d20.
            </p>
            
            <h3 className="text-2xl font-serif text-amber-500 mt-8 mb-4">How it Works</h3>
            <ul className="list-disc pl-6 space-y-2 text-zinc-300">
              <li>Roll a <strong>d20</strong>. If you beat the cat's Armor Class (AC), you hit!</li>
              <li>Roll a <strong>d6</strong> for damage. Watch the cat's HP drop.</li>
            </ul>

            <h3 className="text-2xl font-serif text-amber-500 mt-8 mb-4">The Catch (Why you're sweating)</h3>
            <p>
              The one who deals the fatal blow to the cat <strong>LOSES</strong>. It's a twisted game of chicken. You <em>must</em> attack, but you're praying to the dice gods for a miss or a pathetic flesh wound.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-300">
              <li><strong>You kill the cat:</strong> Game over. The local druids will hear of this.</li>
              <li><strong>The goblin kills the cat:</strong> You survive! Advance to face an even angrier goblin.</li>
              <li>Survive all 9 levels to win the game.</li>
            </ul>
            <p className="italic text-amber-600/80 pt-4">
              May your rolls be terribly, wonderfully low.
            </p>
          </div>
        </div>
      </section>

      <audio ref={tavernMusicRef} src="/sounds/tavernBlaze.mp3" preload="auto" autoPlay muted loop />
    </div>
  );
}
