import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Sword, Skull, Cat, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import Dice3D from './Dice3D';
import { cn } from '../lib/utils';

type MusicPlaybackState = 'playing' | 'paused' | 'stopped';

type CatEntity = {
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
};

type PotionEffect = 'roll_minus_3' | 'heal_cat_2' | 'roll_plus_3' | 'cat_ac_plus_2' | 'cat_ac_minus_2' | 'damage_cat_2';

type PotionDef = {
  id: string;
  name: string;
  desc: string;
  effect: PotionEffect;
  icon: string;
  color: string;
};

const POTIONS_DB: PotionDef[] = [
  { id: 'whiskey', name: 'Whiskey', desc: '-3 to your roll', effect: 'roll_minus_3', icon: '/images/elements/items/whiskey.png', color: 'bg-orange-900/50 text-orange-500' },
  { id: 'heal', name: 'Heal Other', desc: '+2 HP to Cat', effect: 'heal_cat_2', icon: '/images/elements/items/heal.png', color: 'bg-green-900/50 text-green-500' },
  { id: 'focus', name: 'Focus', desc: '+3 to your roll', effect: 'roll_plus_3', icon: '/images/elements/items/pill.png', color: 'bg-blue-900/50 text-blue-500' },
  { id: 'shield', name: 'Cat Shield', desc: '+2 Cat AC', effect: 'cat_ac_plus_2', icon: '/images/elements/items/catshield.png', color: 'bg-indigo-900/50 text-indigo-500' },
  { id: 'vuln', name: 'Cat Vuln', desc: '-2 Cat AC', effect: 'cat_ac_minus_2', icon: '/images/elements/items/catnip.png', color: 'bg-red-900/50 text-red-500' },
  { id: 'poison', name: 'Poison', desc: '-2 HP to Cat', effect: 'damage_cat_2', icon: '/images/elements/items/skull.png', color: 'bg-purple-900/50 text-purple-500' },
];

type Goblin = {
  level: number;
  name: string;
  weapon?: string;
  atkBonus?: number;
  dmgBonus?: number;
};

const GOBLINS: Goblin[] = [
  { level: 1, name: "Goblin Runt", weapon: "Axe", atkBonus: 0, dmgBonus: 2 },
  { level: 2, name: "Goblin Scrapper", weapon: "Magic Dagger", atkBonus: 1, dmgBonus: 0 },
  { level: 3, name: "Goblin Brawler" },
  { level: 4, name: "Goblin Hunter" },
  { level: 5, name: "Goblin Shaman" },
  { level: 6, name: "Goblin Chieftain" },
  { level: 7, name: "Goblin Warlord" },
  { level: 8, name: "Goblin Emperor" },
  { level: 9, name: "The Goblin God" },
];

const CAT_NAMES = ["Sir Pounce", "Mittens", "Shadow", "Luna", "Whiskers", "Balthazar", "Meowth", "Professor Fluff"];

export default function Game({
  onExit,
  musicVolume,
  setMusicVolume,
  musicPlaybackState,
  setMusicPlaybackState,
}: {
  onExit: () => void;
  musicVolume: number;
  setMusicVolume: (value: number) => void;
  musicPlaybackState: MusicPlaybackState;
  setMusicPlaybackState: (value: MusicPlaybackState) => void;
}) {
  const [level, setLevel] = useState(1);
  const [cat, setCat] = useState<CatEntity | null>(null);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [gameState, setGameState] = useState<'playing' | 'levelComplete' | 'gameOver' | 'gameWon'>('playing');
  
  const [rollPhase, setRollPhase] = useState<'idle' | 'd20' | 'waiting-d6' | 'd6'>('idle');
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [damageResult, setDamageResult] = useState<number | null>(null);
  const [isCriticalHit, setIsCriticalHit] = useState(false);
  const [isWaitingForNextTurn, setIsWaitingForNextTurn] = useState(false);
  
  const [logs, setLogs] = useState<{ id: number; text: string; type: 'info' | 'hit' | 'miss' | 'fatal' }[]>([]);
  const logIdRef = useRef(0);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const diceRollAudioRef = useRef<HTMLAudioElement>(null);
  const missAudioRef = useRef<HTMLAudioElement>(null);
  const hitAudioRef = useRef<HTMLAudioElement>(null);
  const yourTurnAudioRef = useRef<HTMLAudioElement>(null);
  const goblinTurnAudioRef = useRef<HTMLAudioElement>(null);
  const goblinLossAudioRef = useRef<HTMLAudioElement>(null);
  const goblinWinAudioRef = useRef<HTMLAudioElement>(null);
  const catDieAudioRef = useRef<HTMLAudioElement>(null);
  const drinkAudioRef = useRef<HTMLAudioElement>(null);

  const [showVolumeModal, setShowVolumeModal] = useState(false);
  // Volume before muting, so we can restore it on unmute
  const preMuteVolumeRef = useRef(musicVolume);

  const [availablePotions, setAvailablePotions] = useState<PotionDef[]>([]);
  const [activePotionEffects, setActivePotionEffects] = useState<PotionEffect[]>([]);
  const [score, setScore] = useState(0);
  const [scoreEvents, setScoreEvents] = useState<{ id: number; amount: number; label: string; type: 'gain' | 'bonus'; startX: number; startY: number; dx: number; dy: number }[]>([]);
  const scoreEventIdRef = useRef(0);
  const scoreTimeoutsRef = useRef<Record<number, number>>({});
  const scoreTargetRef = useRef<HTMLDivElement>(null);
  const [leaderboardState, setLeaderboardState] = useState<'idle' | 'checking' | 'eligible' | 'ineligible' | 'saving' | 'saved' | 'error'>('idle');
  const [leaderboardName, setLeaderboardName] = useState('');
  const [leaderboardMessage, setLeaderboardMessage] = useState<string | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const hasCheckedLeaderboardRef = useRef(false);
  const [potionPreview, setPotionPreview] = useState<{ id: number; icon: string; name: string; desc: string } | null>(null);
  const potionPreviewIdRef = useRef(0);
  const potionPreviewTimeoutRef = useRef<number | null>(null);
  const [critRollIndicator, setCritRollIndicator] = useState<{ id: number; text: string; tone: 'hit' | 'miss' } | null>(null);
  const critRollIndicatorIdRef = useRef(0);
  const critRollTimeoutRef = useRef<number | null>(null);

  const SCORE_BASE_ROLL = 10;
  const SCORE_CRITICAL_ROLL = 30;
  const SCORE_MISS_BONUS = 8;
  const SCORE_LEVEL_PASS = 70;
  const SCORE_GAME_WIN = 140;

  const addLog = (text: string, type: 'info' | 'hit' | 'miss' | 'fatal' = 'info') => {
    setLogs(prev => [...prev, { id: logIdRef.current++, text, type }]);
  };

  const triggerHitHaptic = () => {
    if (typeof window === 'undefined') return;

    const isMobileDevice = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    if (!isMobileDevice) return;

    if (typeof window.navigator.vibrate === 'function') {
      // Short double pulse to feel like an impact without being too aggressive.
      window.navigator.vibrate([22, 35, 28]);
    }
  };

  const playCatDeathAudio = () => {
    const audioRefs = [
      diceRollAudioRef,
      missAudioRef,
      hitAudioRef,
      yourTurnAudioRef,
      goblinTurnAudioRef,
      goblinLossAudioRef,
      goblinWinAudioRef,
      drinkAudioRef,
      catDieAudioRef,
    ];

    for (const ref of audioRefs) {
      if (!ref.current) continue;
      ref.current.pause();
      ref.current.currentTime = 0;
    }

    if (catDieAudioRef.current) {
      catDieAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const addScore = (amount: number) => {
    if (amount === 0) return;
    setScore(prev => prev + amount);
  };

  const getScoreFlightPath = () => {
    if (typeof window === 'undefined') {
      return { startX: 0, startY: 0, dx: 0, dy: 0 };
    }

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    if (!scoreTargetRef.current) {
      return { startX, startY, dx: 0, dy: -220 };
    }

    const rect = scoreTargetRef.current.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    return {
      startX,
      startY,
      dx: targetX - startX,
      dy: targetY - startY,
    };
  };

  const addScoreEvent = (amount: number, label: string, type: 'gain' | 'bonus' = 'gain') => {
    if (amount === 0) return;
    addScore(amount);
    const id = scoreEventIdRef.current++;
    const flight = getScoreFlightPath();
    setScoreEvents(prev => [{ id, amount, label, type, ...flight }, ...prev]);

    const timer = window.setTimeout(() => {
      setScoreEvents(prev => prev.filter(event => event.id !== id));
      delete scoreTimeoutsRef.current[id];
    }, 900);

    scoreTimeoutsRef.current[id] = timer;
  };

  const awardPlayerRollAttempt = () => {
    if (turn !== 'player') return;
    addScore(SCORE_BASE_ROLL);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      Object.values(scoreTimeoutsRef.current).forEach(clearTimeout);
      if (potionPreviewTimeoutRef.current !== null) {
        window.clearTimeout(potionPreviewTimeoutRef.current);
      }
      if (critRollTimeoutRef.current !== null) {
        window.clearTimeout(critRollTimeoutRef.current);
      }
    };
  }, []);

  const startLevel = (lvl: number) => {
    const newCat: CatEntity = {
      name: CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)],
      hp: Math.floor(Math.random() * 9) + 4, // 4-12
      maxHp: 30,
      ac: Math.floor(Math.random() * 7) + 4, // 4-10
    };
    newCat.maxHp = newCat.hp;
    
    setCat(newCat);
    setLevel(lvl);
    setGameState('playing');
    setRollPhase('idle');
    setRollResult(null);
    setDamageResult(null);
    setIsCriticalHit(false);
    setIsWaitingForNextTurn(false);
    setLogs([]);
    setLeaderboardState('idle');
    setLeaderboardName('');
    setLeaderboardMessage(null);
    setLeaderboardRank(null);
    hasCheckedLeaderboardRef.current = false;
    setCritRollIndicator(null);

    if (critRollTimeoutRef.current !== null) {
      window.clearTimeout(critRollTimeoutRef.current);
      critRollTimeoutRef.current = null;
    }
    
    const numPotions = Math.min(6, lvl + 1);
    setAvailablePotions(POTIONS_DB.slice(0, numPotions));
    setActivePotionEffects([]);
    
    const firstTurn = Math.random() > 0.5 ? 'player' : 'opponent';
    setTurn(firstTurn);

    addLog(`Level ${lvl}: A wild ${newCat.name} appears!`, 'info');
    addLog(`${firstTurn === 'player' ? 'Player goes' : GOBLINS[lvl - 1].name + ' goes'} first.`, 'info');

    if (firstTurn === 'player' && yourTurnAudioRef.current) {
      yourTurnAudioRef.current.currentTime = 0;
      yourTurnAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }

    if (firstTurn === 'opponent' && goblinTurnAudioRef.current) {
      goblinTurnAudioRef.current.currentTime = 0;
      goblinTurnAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  // Initialize first level
  useEffect(() => {
    startLevel(1);
  }, []);

  const handleRoll = () => {
    if (gameState !== 'playing' || !cat) return;
    
    if (rollPhase === 'idle') {
      if (turn === 'player') awardPlayerRollAttempt();
      setRollPhase('d20');
      setRollResult(null);
      setDamageResult(null);
      
      // Play dice roll sound
      if (diceRollAudioRef.current) {
        diceRollAudioRef.current.currentTime = 0;
        diceRollAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      
      const attackerName = turn === 'player' ? 'Player' : GOBLINS[level - 1].name;
      addLog(`${attackerName} is rolling to hit...`, 'info');

      // Simulate roll duration
      setTimeout(() => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        setRollResult(d20);
      }, 1750);
    } else if (rollPhase === 'waiting-d6' && turn === 'player') {
      awardPlayerRollAttempt();
      setRollPhase('d6');
      setRollResult(null);
      
      // Play dice roll sound
      if (diceRollAudioRef.current) {
        diceRollAudioRef.current.currentTime = 0;
        diceRollAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      
      addLog(`Player is rolling damage...`, 'info');
      
      setTimeout(() => {
        const d6 = Math.floor(Math.random() * 6) + 1;
        setRollResult(d6);
      }, 1750);
    }
  };

  const handleRollRef = useRef(handleRoll);
  useEffect(() => {
    handleRollRef.current = handleRoll;
  }, [handleRoll]);

  useEffect(() => {
    setActivePotionEffects([]);
  }, [turn]);

  // Opponent AI
  useEffect(() => {
    if (gameState === 'playing' && turn === 'opponent' && rollPhase === 'idle' && cat) {
      const timer = setTimeout(() => {
        handleRollRef.current();
      }, 2000); // 2 second pause before opponent decides to roll
      return () => clearTimeout(timer);
    }
  }, [turn, gameState, rollPhase, cat]);

  // Play sound when a turn begins
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (turn === 'player' && yourTurnAudioRef.current) {
      yourTurnAudioRef.current.currentTime = 0;
      yourTurnAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }

    if (turn === 'opponent' && goblinTurnAudioRef.current) {
      goblinTurnAudioRef.current.currentTime = 0;
      goblinTurnAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [turn, gameState]);

  useEffect(() => {
    if (musicVolume > 0) {
      preMuteVolumeRef.current = musicVolume;
    }
  }, [musicVolume]);

  const usePotion = (potion: PotionDef) => {
    if (gameState !== 'playing') return;

    if (drinkAudioRef.current) {
      drinkAudioRef.current.currentTime = 0;
      drinkAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }

    const previewId = potionPreviewIdRef.current++;
    setPotionPreview({ id: previewId, icon: potion.icon, name: potion.name, desc: potion.desc });
    if (potionPreviewTimeoutRef.current !== null) {
      window.clearTimeout(potionPreviewTimeoutRef.current);
    }
    potionPreviewTimeoutRef.current = window.setTimeout(() => {
      setPotionPreview(null);
      potionPreviewTimeoutRef.current = null;
    }, 1500);
    
    setAvailablePotions(prev => prev.filter(p => p.id !== potion.id));
    
    if (potion.effect === 'heal_cat_2') {
      setCat(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + 2) } : null);
      addLog(`Player used ${potion.name}! Cat heals 2 HP.`, 'info');
    } else if (potion.effect === 'damage_cat_2') {
      if (cat) {
        const newHp = Math.max(0, cat.hp - 2);
        setCat({ ...cat, hp: newHp });
        triggerHitHaptic();
        addLog(`Player used ${potion.name}! Cat takes 2 damage.`, 'info');
        if (newHp <= 0) {
          addLog(`${cat.name} has died!`, 'fatal');
          playCatDeathAudio();
          setIsWaitingForNextTurn(true);
          setTimeout(() => {
            setGameState('gameOver');
            setIsWaitingForNextTurn(false);
          }, 2000);
        }
      }
    } else {
      setActivePotionEffects(prev => [...prev, potion.effect]);
      addLog(`Player used ${potion.name}!`, 'info');
    }
  };

  const onRollComplete = () => {
    if (!cat || rollResult === null) return;
    
    const currentGoblin = GOBLINS[level - 1];
    const attackerName = turn === 'player' ? 'Player' : currentGoblin.name;
    
    let atkBonus = turn === 'opponent' ? (currentGoblin.atkBonus || 0) : 0;
    const dmgBonus = turn === 'opponent' ? (currentGoblin.dmgBonus || 0) : 0;
    
    let effectiveAc = cat.ac;

    if (activePotionEffects.includes('cat_ac_plus_2')) effectiveAc += 2;
    if (activePotionEffects.includes('cat_ac_minus_2')) effectiveAc -= 2;

    if (turn === 'player') {
      if (activePotionEffects.includes('roll_minus_3')) atkBonus -= 3;
      if (activePotionEffects.includes('roll_plus_3')) atkBonus += 3;
    }
    
    if (rollPhase === 'd20') {
      const isCriticalRoll = rollResult === 20 || rollResult === 1;
      const isCriticalHit = rollResult === 20;
      const totalAtk = rollResult + atkBonus;
      const hit = totalAtk >= effectiveAc || isCriticalHit; // 20 always hits
      setIsCriticalHit(isCriticalHit);

      if (isCriticalRoll) {
        const indicatorId = critRollIndicatorIdRef.current++;
        setCritRollIndicator({
          id: indicatorId,
          text: rollResult === 20 ? 'NAT 20 - CRITICAL HIT' : 'NAT 1 - CRITICAL MISS',
          tone: rollResult === 20 ? 'hit' : 'miss',
        });

        if (critRollTimeoutRef.current !== null) {
          window.clearTimeout(critRollTimeoutRef.current);
        }

        critRollTimeoutRef.current = window.setTimeout(() => {
          setCritRollIndicator((current) => (current?.id === indicatorId ? null : current));
          critRollTimeoutRef.current = null;
        }, 1200);
      }
      
      if (atkBonus !== 0) {
        const sign = atkBonus > 0 ? '+' : '-';
        addLog(`${attackerName} rolls ${rollResult} ${sign} ${Math.abs(atkBonus)} = ${totalAtk}${isCriticalRoll ? ' (CRIT!)' : ''}`, 'info');
      } else {
        addLog(`${attackerName} rolls ${rollResult}${isCriticalRoll ? ' (CRIT!)' : ''}`, 'info');
      }

      if (turn === 'player' && isCriticalRoll) {
        addScoreEvent(SCORE_CRITICAL_ROLL, `${rollResult === 20 ? 'Critical Hit' : 'Critical Roll'} +${SCORE_CRITICAL_ROLL}`, 'bonus');
      }

      if (hit) {
        addLog(`Hit!`, 'hit');
        
        // Play hit sound
        if (hitAudioRef.current) {
          hitAudioRef.current.currentTime = 0;
          hitAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
        
        if (turn === 'player') {
          setRollPhase('waiting-d6');
          addLog(`Waiting for Player to roll damage...`, 'info');
        } else {
          // Pause briefly, then roll d6
          setTimeout(() => {
            setRollPhase('d6');
            setRollResult(null);

            // Play dice roll sound for opponent damage roll as well.
            if (diceRollAudioRef.current) {
              diceRollAudioRef.current.currentTime = 0;
              diceRollAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }
            
            addLog(`${attackerName} is rolling damage...`, 'info');
            setTimeout(() => {
              const d6 = Math.floor(Math.random() * 6) + 1;
              setRollResult(d6);
            }, 1750);
          }, 1000); // 1 second pause before rolling damage
        }
      } else {
        addLog(`Miss!`, 'miss');
        if (turn === 'player') {
          addScoreEvent(SCORE_MISS_BONUS, `Miss Bonus +${SCORE_MISS_BONUS}`, 'bonus');
        }
        
        // Play miss sound
        if (missAudioRef.current) {
          missAudioRef.current.currentTime = 0;
          missAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Pause before switching turns
        setIsWaitingForNextTurn(true);
        setTimeout(() => {
          setRollPhase('idle');
          setRollResult(null);
          setTurn(turn === 'player' ? 'opponent' : 'player');
          setIsWaitingForNextTurn(false);
        }, 1500);
      }
    } else if (rollPhase === 'd6') {
      const baseDamage = rollResult;
      const diceDamage = isCriticalHit ? baseDamage * 2 : baseDamage;
      const totalDamage = diceDamage + dmgBonus;
      setDamageResult(totalDamage);
      
      const newHp = Math.max(0, cat.hp - totalDamage);
      setCat({ ...cat, hp: newHp });
      triggerHitHaptic();
      
      if (dmgBonus > 0) {
        addLog(`Dealt ${totalDamage} damage (${diceDamage} + ${dmgBonus})${isCriticalHit ? ' (Doubled!)' : ''}.`, 'hit');
      } else {
        addLog(`Dealt ${totalDamage} damage${isCriticalHit ? ' (Doubled!)' : ''}.`, 'hit');
      }

      if (newHp <= 0) {
        addLog(`${cat.name} has died!`, 'fatal');
        playCatDeathAudio();
        
        setIsWaitingForNextTurn(true);
        setTimeout(() => {
          setRollPhase('idle');
          setRollResult(null);
          if (turn === 'player') {
            addLog(`You killed ${cat.name}. You lose!`, 'fatal');
            setGameState('gameOver');
            setTimeout(() => {
              if (goblinWinAudioRef.current) {
                goblinWinAudioRef.current.currentTime = 0;
                goblinWinAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
              }
            }, 200);
          } else {
            // Opponent kills the cat
            addLog(`${attackerName} killed ${cat.name}. You survive!`, 'info');
            addScoreEvent(SCORE_LEVEL_PASS, `Level Clear +${SCORE_LEVEL_PASS}`, 'bonus');
            if (level === 9) {
              addScoreEvent(SCORE_GAME_WIN, `Victory Bonus +${SCORE_GAME_WIN}`, 'bonus');
              setGameState('gameWon');
            } else {
              setGameState('levelComplete');
            }
            setTimeout(() => {
              if (goblinLossAudioRef.current) {
                goblinLossAudioRef.current.currentTime = 0;
                goblinLossAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
              }
            }, 200);
          }
          setIsWaitingForNextTurn(false);
        }, 1500);
        return;
      }
      
      // Pause before switching turns
      setIsWaitingForNextTurn(true);
      setTimeout(() => {
        setRollPhase('idle');
        setRollResult(null);
        setDamageResult(null);
        setTurn(turn === 'player' ? 'opponent' : 'player');
        setIsWaitingForNextTurn(false);
      }, 1500);
    }
  };

  const checkLeaderboardQualification = async () => {
    setLeaderboardState('checking');
    setLeaderboardMessage(null);

    try {
      const res = await fetch(`/api/scoreboard/qualify?score=${score}&level=${level}`);
      if (!res.ok) {
        throw new Error('Leaderboard service unavailable. Start both services with: npm run dev');
      }
      const data = await res.json();

      if (data.qualifies) {
        setLeaderboardState('eligible');
        setLeaderboardRank(typeof data.rank === 'number' ? data.rank : null);
      } else {
        setLeaderboardState('ineligible');
        setLeaderboardMessage('Score did not reach the top 30 leaderboard.');
      }
    } catch (error) {
      setLeaderboardState('error');
      setLeaderboardMessage(error instanceof Error ? error.message : 'Could not check leaderboard. Start both services with: npm run dev');
    }
  };

  useEffect(() => {
    const gameEnded = gameState === 'gameOver' || gameState === 'gameWon';
    if (!gameEnded) return;
    if (hasCheckedLeaderboardRef.current) return;

    hasCheckedLeaderboardRef.current = true;
    checkLeaderboardQualification();
  }, [gameState, score, level]);

  const submitLeaderboardScore = async () => {
    const cleanedName = leaderboardName.trim();
    if (!/^[A-Za-z0-9 ]{1,24}$/.test(cleanedName)) {
      setLeaderboardMessage('Name must be letters/numbers only (max 24).');
      return;
    }

    setLeaderboardState('saving');
    setLeaderboardMessage(null);

    try {
      const res = await fetch('/api/scoreboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanedName, score, level }),
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}));
        throw new Error(errorPayload.error || 'Failed to submit score. Ensure API is running (npm run dev).');
      }

      const data = await res.json();
      setLeaderboardRank(typeof data.rank === 'number' ? data.rank : leaderboardRank);
      setLeaderboardState('saved');
      setLeaderboardMessage('Score saved to leaderboard.');
    } catch (error) {
      setLeaderboardState('error');
      setLeaderboardMessage(error instanceof Error ? error.message : 'Failed to save score. Ensure API is running (npm run dev).');
    }
  };

  const renderLeaderboardPanel = () => {
    if (leaderboardState === 'idle') return null;

    return (
      <div className="mt-4 p-4 rounded-lg border border-amber-900/50 bg-zinc-900/70 space-y-3 text-left">
        <div className="text-amber-300 font-semibold">Leaderboard Check</div>

        {leaderboardState === 'checking' && (
          <p className="text-zinc-300 text-sm">Checking top 30 leaderboard...</p>
        )}

        {(leaderboardState === 'ineligible' || leaderboardState === 'error') && (
          <p className="text-zinc-300 text-sm">{leaderboardMessage}</p>
        )}

        {leaderboardState === 'eligible' && (
          <>
            <p className="text-zinc-200 text-sm">
              Qualified for leaderboard{leaderboardRank ? ` at #${leaderboardRank}` : ''}. Enter your name:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={leaderboardName}
                onChange={(e) => setLeaderboardName(e.target.value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 24))}
                placeholder="Name (letters/numbers only)"
                className="flex-1 px-3 py-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-200 outline-none focus:border-amber-500"
                maxLength={24}
              />
              <button
                onClick={submitLeaderboardScore}
                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold"
              >
                Submit
              </button>
            </div>
            {leaderboardMessage && <p className="text-zinc-300 text-sm">{leaderboardMessage}</p>}
          </>
        )}

        {leaderboardState === 'saving' && (
          <p className="text-zinc-300 text-sm">Saving score...</p>
        )}

        {leaderboardState === 'saved' && (
          <p className="text-amber-200 text-sm">Saved. Current rank: #{leaderboardRank ?? '-'}</p>
        )}
      </div>
    );
  };

  if (!cat) return null;

  const currentGoblin = GOBLINS[level - 1];
  const maxCaveIndex = 6;
  const caveImage = `cave${Math.min(level, maxCaveIndex)}`;

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-zinc-200 font-sans relative overflow-hidden">
      <div className="relative h-full w-full max-w-2xl mx-auto flex flex-col overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover pointer-events-none"
          style={{ backgroundImage: `url('/images/elements/caves/${caveImage}.png')` }}
        />
      {/* 3D Dice Overlay */}
      {rollPhase !== 'idle' && (
        <Dice3D 
          rolling={rollResult === null} 
          result={rollResult} 
          roller={turn} 
          type={rollPhase === 'waiting-d6' ? 'd20' : rollPhase}
          onRollComplete={onRollComplete} 
        />
      )}

      <AnimatePresence>
        {critRollIndicator && (
          <motion.div
            key={critRollIndicator.id}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div
              className={cn(
                "px-4 py-2 rounded-xl border-2 font-black font-serif tracking-wide text-lg sm:text-xl whitespace-nowrap shadow-2xl",
                critRollIndicator.tone === 'hit'
                  ? "text-amber-100 bg-amber-900/90 border-amber-300/80"
                  : "text-red-100 bg-red-900/90 border-red-300/80"
              )}
            >
              {critRollIndicator.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="shrink-0 p-2 px-4 border-b border-zinc-900 flex flex-wrap justify-between items-center gap-2 bg-zinc-950/80 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <div className="font-serif text-lg text-amber-500">Hathul</div>
          <div className="text-zinc-500 text-xs">Level {level} / 9</div>
        </div>
        <div className="flex items-center gap-3">
          <div ref={scoreTargetRef} className="text-amber-200 text-sm font-semibold">Score: {score}</div>
          <button
            onClick={() => setShowVolumeModal(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-amber-500 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors select-none touch-none"
            title="Adjust music volume"
          >
            {musicPlaybackState === 'playing' && musicVolume > 0 ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-60" />}
            <span className={musicPlaybackState !== 'playing' || musicVolume === 0 ? 'opacity-40' : ''}>{Math.round(musicVolume * 100)}%</span>
          </button>
          <button onClick={onExit} className="text-zinc-500 hover:text-zinc-300 text-xs">Flee</button>
        </div>
      </header>

      <div className="fixed inset-0 z-40 pointer-events-none">
        <AnimatePresence>
          {scoreEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.75, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0.9], scale: [0.75, 1.08, 0.95], x: event.dx, y: event.dy }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className="fixed rounded-full px-4 py-2 text-sm font-bold shadow-2xl text-zinc-950 bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-100/80"
              style={{ left: event.startX, top: event.startY }}
            >
              +{event.amount} {event.label}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {potionPreview && (
          <motion.div
            key={potionPreview.id}
            initial={{ opacity: 0, y: 0, scale: 0.92 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: 120, scale: 0.95 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[360px] max-w-[90vw] rounded-2xl border border-amber-400/60 bg-zinc-900/95 shadow-2xl p-6 flex flex-col items-center justify-center gap-4">
              <img
                src={potionPreview.icon}
                alt={potionPreview.name}
                className="w-[292px] h-[292px] max-w-[70vw] max-h-[50vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <p className="text-amber-100 text-sm text-center leading-snug">{potionPreview.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battlefield */}
      <main className="flex-1 min-h-0 flex flex-col p-2 gap-2 sm:gap-4 w-full z-10">
        
        {/* Opponent Area */}
        <div className={cn(
          "shrink-0 p-3 sm:p-4 rounded-2xl border-2 transition-all duration-500 flex items-center gap-4 relative overflow-hidden min-h-[110px]",
          turn === 'opponent' ? "border-amber-400 bg-amber-950/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] scale-[1.01]" : "border-zinc-700 bg-zinc-900/70"
        )}>
          {turn === 'opponent' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />}
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
            <img 
              src={`/images/goblins/icon_${level}.png`} 
              alt={currentGoblin.name}
              className="w-full h-full object-contain drop-shadow-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
              <h3 className="font-serif text-lg sm:text-xl text-zinc-100">{currentGoblin.name}</h3>
              {turn === 'opponent' && <span className="text-xs sm:text-sm font-bold text-amber-300 animate-pulse">ACTIVE TURN</span>}
            </div>
            {(currentGoblin.atkBonus || currentGoblin.dmgBonus || currentGoblin.weapon) && (
              <div className="text-xs text-zinc-400 font-mono">
                {currentGoblin.weapon && <span className="mr-2">{currentGoblin.weapon}</span>}
                {currentGoblin.atkBonus ? `Atk: +${currentGoblin.atkBonus} ` : ''}
                {currentGoblin.dmgBonus ? `Dmg: +${currentGoblin.dmgBonus}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* The Cat */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1 sm:py-4 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent pointer-events-none" />
          
          <motion.div 
            animate={{ y: [0, -5, 0], rotateX: [2, 3, 2], rotateY: [-1, 1, -1], z: [22, 26, 22] }}
            whileHover={{
              x: [0, -6, 4, -9, 7, -3, 0],
              rotateX: [2, 10, -4, 12, -7, 5, 2],
              rotateY: [-1, -15, 8, 13, -11, 6, -1],
            }}
            transition={{ repeat: Infinity, duration: 5.8, ease: "easeInOut", times: [0, 0.14, 0.29, 0.47, 0.68, 0.86, 1] }}
            className="bg-zinc-900/95 rounded-2xl shadow-2xl p-4 transform-gpu"
            style={{ perspective: 1300, transformStyle: 'preserve-3d', transformOrigin: '50% 50%' }}
          >
            <motion.div 
              key={cat.name}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: damageResult !== null ? [-5, 5, -5, 5, 0] : 0
              }}
              transition={{ duration: damageResult !== null ? 0.4 : 0.3 }}
              className="flex flex-col items-center gap-2 sm:gap-3"
            >
              <div className="relative">
                <div
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-zinc-900/80 shadow-2xl transform-gpu rotate-1 transition-transform duration-700 flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={`/images/cats/cat_${level}.png`} 
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Damage Indicator */}
                <AnimatePresence>
                  {damageResult !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.82 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [10, -10, -30, -46],
                        scale: [0.82, 1.08, 1, 0.96],
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.78, ease: 'easeOut' }}
                      className={cn(
                        "absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl border font-black font-serif tracking-wide drop-shadow-2xl whitespace-nowrap pointer-events-none z-20",
                        isCriticalHit
                          ? "text-amber-100 text-2xl sm:text-3xl bg-amber-900/90 border-amber-300/80 shadow-[0_0_24px_rgba(245,158,11,0.45)]"
                          : "text-red-100 text-xl sm:text-2xl bg-red-900/85 border-red-300/70"
                      )}
                    >
                      -{damageResult} {isCriticalHit && "CRITICAL HIT"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="text-center space-y-1 sm:space-y-2">
                <h2 className="text-xl font-serif text-amber-100">{cat.name}</h2>
                <div className="flex items-center justify-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-red-400" title="Health Points">
                    <Heart className="w-3 h-3" />
                    <span>{cat.hp} / {cat.maxHp}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400" title="Armor Class">
                    <Shield className="w-3 h-3" />
                    <span>{cat.ac}</span>
                  </div>
                </div>
                {/* Health Bar */}
                <div className="w-36 sm:w-40 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1 mx-auto">
                  <motion.div 
                    className="h-full bg-red-500"
                    initial={{ width: '100%' }}
                    animate={{ width: `${Math.max(0, (cat.hp / cat.maxHp) * 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Player Area Container */}
        <div className="flex flex-col gap-2 shrink-0 w-full mx-auto">
          {/* Potions Bar */}
          <div className="grid grid-cols-5 gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
            {availablePotions.map((potion) => (
              <div key={potion.id} className="w-full h-20 sm:h-24 rounded flex items-center justify-center relative overflow-hidden">
                <button
                  onClick={() => usePotion(potion)}
                  disabled={gameState !== 'playing'}
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center gap-1 px-1 transition-all bg-transparent",
                    gameState === 'playing' ? "hover:brightness-125 cursor-pointer active:scale-95" : "opacity-50 cursor-not-allowed"
                  )}
                  title={`${potion.name}: ${potion.desc}`}
                >
                  <img
                    src={potion.icon}
                    alt={potion.name}
                    className="w-10 h-10 object-contain scale-[1.7]"
                    referrerPolicy="no-referrer"
                  />
                  <span className="mt-3 text-[9px] sm:text-[10px] leading-tight text-zinc-300 text-center whitespace-normal break-words">
                    {potion.desc}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Player Box */}
          <div className={cn(
            "p-2 sm:p-3 rounded-lg border transition-all duration-500 flex items-center gap-3 relative overflow-hidden",
            turn === 'player' ? "border-amber-500 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.02]" : "border-zinc-800 bg-zinc-900/50 opacity-60"
          )}>
            {turn === 'player' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
            
            <div className="flex-1 flex flex-col justify-center">
              {turn === 'player' && <span className="text-[10px] font-bold text-amber-500 animate-pulse mb-0.5">YOUR TURN</span>}
            </div>
            
            <div className="ml-auto shrink-0">
              <button
                onClick={handleRoll}
                disabled={turn !== 'player' || (rollPhase !== 'idle' && rollPhase !== 'waiting-d6') || gameState !== 'playing' || isWaitingForNextTurn}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-sm transition-colors flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-600",
                  rollPhase === 'waiting-d6' 
                    ? "bg-red-600 hover:bg-red-500 text-white" 
                    : "bg-amber-600 hover:bg-amber-500 text-zinc-950"
                )}
              >
                <Sword className="w-4 h-4" />
                {rollPhase === 'waiting-d6' ? 'Roll Damage' : 'Roll to Hit'}
              </button>
            </div>
          </div>
        </div>

        {/* Combat Log */}
        <div ref={logContainerRef} className="h-20 sm:h-24 shrink-0 bg-zinc-900/80 border border-zinc-800 rounded-lg p-2 overflow-y-auto font-mono text-xs">
          {logs.map((log) => (
            <div key={log.id} className={cn(
              "mb-0.5",
              log.type === 'hit' && "text-red-400",
              log.type === 'miss' && "text-zinc-500",
              log.type === 'fatal' && "text-red-500 font-bold",
              log.type === 'info' && "text-amber-200/70"
            )}>
              {log.text}
            </div>
          ))}
        </div>

      </main>

      {/* Volume Control Modal */}
      <AnimatePresence>
        {showVolumeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVolumeModal(false)}
            className="absolute inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4"
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
                  onChange={(e) => {
                    const nextVolume = parseInt(e.target.value, 10) / 100;
                    setMusicVolume(nextVolume);
                    if (nextVolume > 0) {
                      preMuteVolumeRef.current = nextVolume;
                      setMusicPlaybackState('playing');
                      return;
                    }
                    if (musicPlaybackState === 'playing') {
                      setMusicPlaybackState('paused');
                    }
                  }}
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
                onClick={() => {
                  if (musicVolume > 0) {
                    preMuteVolumeRef.current = musicVolume;
                    setMusicVolume(0);
                    if (musicPlaybackState === 'playing') {
                      setMusicPlaybackState('paused');
                    }
                    return;
                  }
                  const restore = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 0.5;
                  setMusicVolume(restore);
                  setMusicPlaybackState('playing');
                }}
                className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-serif text-lg transition-colors"
              >
                {musicVolume > 0 ? 'Mute' : 'Unmute'}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    if (musicVolume <= 0) {
                      const restore = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 0.5;
                      setMusicVolume(restore);
                    }
                    setMusicPlaybackState('playing');
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg font-serif text-sm transition-colors',
                    musicPlaybackState === 'playing'
                      ? 'bg-amber-600 text-zinc-950'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  )}
                >
                  Play
                </button>
                <button
                  onClick={() => setMusicPlaybackState('paused')}
                  className={cn(
                    'px-4 py-2 rounded-lg font-serif text-sm transition-colors',
                    musicPlaybackState === 'paused'
                      ? 'bg-amber-600 text-zinc-950'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  )}
                >
                  Pause
                </button>
                <button
                  onClick={() => setMusicPlaybackState('stopped')}
                  className={cn(
                    'px-4 py-2 rounded-lg font-serif text-sm transition-colors',
                    musicPlaybackState === 'stopped'
                      ? 'bg-amber-600 text-zinc-950'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  )}
                >
                  Stop
                </button>
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
      </AnimatePresence>

      {/* Game Over / Level Complete Overlays */}
      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url('/images/elements/caves/${caveImage}.png')` }}
            />
            <div className="absolute inset-0 bg-zinc-950/28 backdrop-blur-[1px]" />

            <div className="relative z-10 max-w-md w-full space-y-8">
              {gameState === 'gameOver' && (
                <>
                  <h2 className="text-5xl font-serif text-red-500">You Lose</h2>
                  <div className="flex justify-center my-6">
                    <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center border-4 border-red-900/50">
                      <img 
                        src={`/images/cats/cat_${level}.png`} 
                        alt={cat.name}
                        className="w-full h-full object-cover grayscale opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <p className="text-zinc-400">You killed {cat.name}. The guilt is unbearable.</p>
                  {renderLeaderboardPanel()}
                  <button onClick={onExit} className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-sm font-serif text-xl w-full transition-colors">
                    Main Menu
                  </button>
                </>
              )}
              
              {gameState === 'levelComplete' && (
                <>
                  <h2 className="text-5xl font-serif text-amber-500">Level Cleared</h2>
                  <p className="text-zinc-400">{GOBLINS[level - 1].name} killed {cat.name}. You are safe... for now.</p>
                  <button onClick={() => startLevel(level + 1)} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-sm font-serif text-xl w-full transition-colors flex items-center justify-center gap-2">
                    Next Level <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {gameState === 'gameWon' && (
                <>
                  <h2 className="text-5xl font-serif text-amber-500">Victory!</h2>
                  <p className="text-zinc-400">You survived all 9 levels. The cats are safe.</p>
                  {renderLeaderboardPanel()}
                  <button onClick={() => startLevel(1)} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-sm font-serif text-xl w-full transition-colors">
                    Play Again
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio elements for sound effects */}
      <audio ref={diceRollAudioRef} src="/sounds/diceroll.wav" preload="auto" />
      <audio ref={missAudioRef} src="/sounds/miss.wav" preload="auto" />
      <audio ref={hitAudioRef} src="/sounds/cathit.wav" preload="auto" />
      <audio ref={yourTurnAudioRef} src="/sounds/yourturn.wav" preload="auto" />
      <audio ref={goblinTurnAudioRef} src="/sounds/goblinturn.wav" preload="auto" />
      <audio ref={goblinLossAudioRef} src="/sounds/goblinloss.wav" preload="auto" />
      <audio ref={goblinWinAudioRef} src="/sounds/goblinwin.wav" preload="auto" />
      <audio ref={catDieAudioRef} src="/sounds/catdie.wav" preload="auto" />
      <audio ref={drinkAudioRef} src="/sounds/drink.wav" preload="auto" />
      </div>
    </div>
  );
}
