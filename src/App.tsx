/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Sword } from 'lucide-react';
import Game from './components/Game';

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing'>('start');

  if (gameState === 'playing') {
    return <Game onExit={() => setGameState('start')} />;
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
              src="https://chiaverano.com/hathul/images/elements/splash.png" 
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
    </div>
  );
}
