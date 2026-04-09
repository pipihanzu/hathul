/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { ChevronDown, Sword } from 'lucide-react';
import Game from './components/Game';

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  createdAt: string;
};

const SCOREBOARD_CACHE_KEY = 'hathul-scoreboard-cache';

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing'>('start');
  const [musicVolume, setMusicVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.2;
    const stored = window.localStorage.getItem('hathul-music-volume');
    if (stored === null) return 0.2;
    const parsed = parseFloat(stored);
    return Number.isFinite(parsed) ? parsed : 0.2;
  });
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const loadScoreboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const res = await fetch('/api/scoreboard');
      if (!res.ok) {
        throw new Error('Failed to load scoreboard');
      }
      const data = await res.json();
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setLeaderboardEntries(entries);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SCOREBOARD_CACHE_KEY, JSON.stringify(entries));
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        const cached = window.localStorage.getItem(SCOREBOARD_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setLeaderboardEntries(parsed);
              setLeaderboardError('Live scoreboard unavailable. Showing cached results.');
              return;
            }
          } catch {
            // Ignore cache parse failures and show default error below.
          }
        }
      }
      setLeaderboardError(error instanceof Error ? error.message : 'Could not load scoreboard');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (showScoreboard) {
      loadScoreboard();
    }
  }, [showScoreboard]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('hathul-music-volume', musicVolume.toString());
  }, [musicVolume]);

  if (gameState === 'playing') {
    return <Game onExit={() => setGameState('start')} musicVolume={musicVolume} setMusicVolume={setMusicVolume} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center p-6 text-center">
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
            className="space-y-2 flex flex-col items-center"
          >
            <img
              src="/images/elements/hathul.png"
              alt="Hathul"
              className="w-64 sm:w-80 h-auto object-contain"
              referrerPolicy="no-referrer"
            />
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

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowScoreboard(true)}
            className="px-6 py-3 bg-zinc-900/90 border border-amber-800/50 hover:border-amber-500/60 rounded-sm text-amber-300 hover:text-amber-200 font-serif transition-colors"
          >
            View Scoreboard
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

      {showScoreboard && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowScoreboard(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-amber-900/60 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-2xl font-serif text-amber-300">Top 30 Scoreboard</h3>
              <button
                onClick={() => setShowScoreboard(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
              {leaderboardLoading && <p className="text-zinc-400">Loading scoreboard...</p>}
              {leaderboardError && <p className="text-red-400">{leaderboardError}</p>}

              {!leaderboardLoading && !leaderboardError && leaderboardEntries.length === 0 && (
                <p className="text-zinc-400">No scores yet. Be the first legend.</p>
              )}

              {!leaderboardLoading && !leaderboardError && leaderboardEntries.length > 0 && (
                <div className="space-y-2">
                  {leaderboardEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[56px_1fr_90px_70px] items-center gap-3 rounded-lg px-3 py-2 bg-zinc-950/70 border border-zinc-800"
                    >
                      <div className="text-amber-400 font-semibold">#{index + 1}</div>
                      <div className="text-zinc-200 truncate">{entry.name}</div>
                      <div className="text-amber-200 text-right font-semibold">{entry.score}</div>
                      <div className="text-zinc-400 text-right">L{entry.level}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
