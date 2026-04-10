import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Sword, Skull, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import Dice3D from './Dice3D';
import { cn } from '../lib/utils';

type MusicPlaybackState = 'playing' | 'paused' | 'stopped';

type CatEntity = {
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
};

type PotionEffect = 'roll_minus_3' | 'heal_cat_2' | 'roll_plus_3' | 'cat_ac_plus_2' | 'cat_ac_minus_2' | 'damage_cat_2' | 'light_hand';

type PotionDef = {
  id: string;
  name: string;
  desc: string;
  kind: 'Drink' | 'Spell';
  effect: PotionEffect;
  icon: string;
  color: string;
};

const POTIONS_DB: PotionDef[] = [
  { id: 'light_hand', name: 'Light Hand', desc: 'Next damage is 1 HP', kind: 'Spell', effect: 'light_hand', icon: '/images/elements/items/feather.png', color: 'bg-yellow-900/50 text-yellow-500' },
  { id: 'whiskey', name: 'Dwarven Hard Whiskey', desc: '-3 to your roll', kind: 'Drink', effect: 'roll_minus_3', icon: '/images/elements/items/whiskey.png', color: 'bg-orange-900/50 text-orange-500' },
  { id: 'heal', name: 'Heal Other', desc: '+2 HP to Cat', kind: 'Spell', effect: 'heal_cat_2', icon: '/images/elements/items/heal.png', color: 'bg-green-900/50 text-green-500' },
  { id: 'focus', name: 'Focus', desc: '+3 to your roll', kind: 'Spell', effect: 'roll_plus_3', icon: '/images/elements/items/pill.png', color: 'bg-blue-900/50 text-blue-500' },
  { id: 'shield', name: 'Cat Shield', desc: '+2 Cat AC', kind: 'Spell', effect: 'cat_ac_plus_2', icon: '/images/elements/items/catshield.png', color: 'bg-indigo-900/50 text-indigo-500' },
  { id: 'vuln', name: 'Cat Vuln', desc: '-2 Cat AC', kind: 'Spell', effect: 'cat_ac_minus_2', icon: '/images/elements/items/catnip.png', color: 'bg-red-900/50 text-red-500' },
  { id: 'poison', name: 'Poison', desc: '-2 HP to Cat', kind: 'Spell', effect: 'damage_cat_2', icon: '/images/elements/items/skull.png', color: 'bg-purple-900/50 text-purple-500' },
];

type Goblin = {
  level: number;
  name: string;
  weapon?: string;
  atkBonus?: number;
  dmgBonus?: number;
  minDamage?: number;
  maxDamage?: number;
  fixedDamage?: number;
};

const GOBLINS: Goblin[] = [
  { level: 1, name: "Goblin Runt", weapon: "Axe", atkBonus: 4, dmgBonus: 2 },
  { level: 2, name: "Goblin Scrapper", weapon: "Magic Dagger", atkBonus: 3 },
  { level: 3, name: "Goblin Brawler", weapon: "Hard Hand", dmgBonus: 2 },
  { level: 4, name: "Goblin Hunter", weapon: "Goblin's Dagger" },
  { level: 5, name: "Goblin Shaman", weapon: "Hammer of Good", atkBonus: -2 },
  { level: 6, name: "Goblin Chieftain", weapon: "Trickey Sword", atkBonus: -2, dmgBonus: -1, minDamage: 1 },
  { level: 7, name: "Goblin Warlord", weapon: "Dagger of Milk", minDamage: 1, maxDamage: 3 },
  { level: 8, name: "Goblin Emperor", weapon: "Semi Dragon Tooth", atkBonus: -2, dmgBonus: -1, minDamage: 1 },
  { level: 9, name: "The Goblin God", weapon: "Master Cat Knife", atkBonus: -6, fixedDamage: 1 },
];

const CAT_NAMES = ["Sir Pounce", "Mittens", "Shadow", "Luna", "Whiskers", "Balthazar", "Meowth", "Professor Fluff"];

const LEVEL_CLEARED_COMMENTS: Record<number, string> = {
  1: "The Goblin Runt did the dirty work. Your hands stay clean, your conscience stays negotiable.",
  2: "The Scrapper carved up the cat while you supervised like a true villainous intern.",
  3: "The Brawler solved the problem with blunt force and zero emotional development.",
  4: "The Hunter tracked your target, then your morals, then misplaced both.",
  5: "The Shaman called it a ritual. Historians will probably call it paperwork.",
  6: "The Chieftain delivered justice, goblin-style: loud, messy, and legally unreviewed.",
  7: "The Warlord salutes your leadership. HR has several concerns.",
  8: "The Emperor handled the cat and promoted you from survivor to accessories-to-crime.",
};

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
  const modifierAudioRef = useRef<HTMLAudioElement>(null);

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
  const [potionPreview, setPotionPreview] = useState<{ id: number; icon: string; name: string; desc: string; kind: 'Drink' | 'Spell' } | null>(null);
  const potionPreviewIdRef = useRef(0);
  const potionPreviewTimeoutRef = useRef<number | null>(null);
  const [critRollIndicator, setCritRollIndicator] = useState<{ id: number; text: string; tone: 'hit' | 'miss' } | null>(null);
  const critRollIndicatorIdRef = useRef(0);
  const critRollTimeoutRef = useRef<number | null>(null);
  const [turnPulse, setTurnPulse] = useState<{ target: 'player' | 'opponent'; id: number } | null>(null);
  const turnPulseIdRef = useRef(0);
  const turnPulseTimeoutRef = useRef<number | null>(null);
  const [isCatHitShaking, setIsCatHitShaking] = useState(false);
  const [catEdgeHitFlashId, setCatEdgeHitFlashId] = useState(0);
  const catHitShakeTimeoutRef = useRef<number | null>(null);

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
      if (turnPulseTimeoutRef.current !== null) {
        window.clearTimeout(turnPulseTimeoutRef.current);
      }
      if (catHitShakeTimeoutRef.current !== null) {
        window.clearTimeout(catHitShakeTimeoutRef.current);
      }
    };
  }, []);

  const triggerCatHitShake = () => {
    setIsCatHitShaking(false);
    requestAnimationFrame(() => {
      setIsCatHitShaking(true);
      if (catHitShakeTimeoutRef.current !== null) {
        window.clearTimeout(catHitShakeTimeoutRef.current);
      }
      catHitShakeTimeoutRef.current = window.setTimeout(() => {
        setIsCatHitShaking(false);
        catHitShakeTimeoutRef.current = null;
      }, 280);
    });
  };

  const triggerCatEdgeHitFlash = () => {
    setCatEdgeHitFlashId((prev) => prev + 1);
  };

  useEffect(() => {
    if (damageResult === null) return;

    triggerCatHitShake();
    triggerCatEdgeHitFlash();
  }, [damageResult]);

  useEffect(() => {
    if (gameState !== 'playing' || !cat) return;

    const pulseId = turnPulseIdRef.current++;
    setTurnPulse({ target: turn, id: pulseId });

    if (turnPulseTimeoutRef.current !== null) {
      window.clearTimeout(turnPulseTimeoutRef.current);
    }

    turnPulseTimeoutRef.current = window.setTimeout(() => {
      setTurnPulse((current) => (current?.id === pulseId ? null : current));
      turnPulseTimeoutRef.current = null;
    }, 2000);
  }, [turn, gameState, cat]);

  const startLevel = (lvl: number) => {
    const newCat: CatEntity = {
      name: CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)],
      hp: Math.floor(Math.random() * 9) + 4, // 4-12
      maxHp: 30,
      ac: Math.floor(Math.random() * 7) + 4, // 4-10
    };
    newCat.maxHp = newCat.hp;

    const initGame = () => {
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

    initGame();
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
    setPotionPreview({ id: previewId, icon: potion.icon, name: potion.name, desc: potion.desc, kind: potion.kind });
    if (potionPreviewTimeoutRef.current !== null) {
      window.clearTimeout(potionPreviewTimeoutRef.current);
    }
    potionPreviewTimeoutRef.current = window.setTimeout(() => {
      setPotionPreview(null);
      potionPreviewTimeoutRef.current = null;
    }, 2000);
    
    setAvailablePotions(prev => prev.filter(p => p.id !== potion.id));
    
    if (potion.effect === 'heal_cat_2') {
      setCat(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + 2) } : null);
      addLog(`Player used ${potion.name}! Cat heals 2 HP.`, 'info');
    } else if (potion.effect === 'damage_cat_2') {
      if (cat) {
        const newHp = Math.max(0, cat.hp - 2);
        setCat({ ...cat, hp: newHp });
        triggerCatEdgeHitFlash();
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
    
    let effectiveAc = cat.ac;

    if (activePotionEffects.includes('cat_ac_plus_2')) effectiveAc += 2;
    if (activePotionEffects.includes('cat_ac_minus_2')) effectiveAc -= 2;

    if (turn === 'player') {
      const hasRollModifier = activePotionEffects.includes('roll_minus_3') || activePotionEffects.includes('roll_plus_3');
      if (activePotionEffects.includes('roll_minus_3')) atkBonus -= 3;
      if (activePotionEffects.includes('roll_plus_3')) atkBonus += 3;
      
      // Play modifier sound if a roll modifier was applied
      if (hasRollModifier && modifierAudioRef.current) {
        modifierAudioRef.current.currentTime = 0;
        modifierAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
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
          text: rollResult === 20 ? '20 CRITICAL HIT' : '1 CRITICAL MISS',
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
        triggerCatEdgeHitFlash();
        triggerCatHitShake();
        addLog(`Hit!`, 'hit');
        
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
      let totalDamage = diceDamage;
      let damageDetails = `${diceDamage}`;
      const isLightHandActive = turn === 'player' && activePotionEffects.includes('light_hand');

      if (isLightHandActive) {
        totalDamage = 1;
        damageDetails = 'Light Hand -> fixed 1';
        if (isCriticalHit) {
          setIsCriticalHit(false);
        }
        setActivePotionEffects(prev => prev.filter(effect => effect !== 'light_hand'));
      }

      if (turn === 'opponent') {
        const dmgBonus = currentGoblin.dmgBonus || 0;
        if (dmgBonus !== 0) {
          const sign = dmgBonus > 0 ? '+' : '-';
          damageDetails += ` ${sign} ${Math.abs(dmgBonus)}`;
          totalDamage += dmgBonus;
        }

        if (typeof currentGoblin.fixedDamage === 'number') {
          totalDamage = currentGoblin.fixedDamage;
          damageDetails = `fixed ${totalDamage}`;
        } else {
          if (typeof currentGoblin.minDamage === 'number' && totalDamage < currentGoblin.minDamage) {
            totalDamage = currentGoblin.minDamage;
            damageDetails += ` -> min ${currentGoblin.minDamage}`;
          }
          if (typeof currentGoblin.maxDamage === 'number' && totalDamage > currentGoblin.maxDamage) {
            totalDamage = currentGoblin.maxDamage;
            damageDetails += ` -> max ${currentGoblin.maxDamage}`;
          }
        }

        if (totalDamage < 1) {
          totalDamage = 1;
          damageDetails += ' -> min 1';
        }
      }

      setDamageResult(totalDamage);
      
      const newHp = Math.max(0, cat.hp - totalDamage);
      setCat({ ...cat, hp: newHp });

      if (hitAudioRef.current) {
        hitAudioRef.current.currentTime = 0;
        hitAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      triggerHitHaptic();
      
      if (damageDetails !== `${diceDamage}`) {
        addLog(`Dealt ${totalDamage} damage (${damageDetails})${isCriticalHit ? ' (Doubled!)' : ''}.`, 'hit');
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

  const applySliderVolume = (rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return;

    const clampedPercent = Math.max(0, Math.min(100, parsed));
    const nextVolume = clampedPercent / 100;
    setMusicVolume(nextVolume);

    if (nextVolume > 0) {
      preMuteVolumeRef.current = nextVolume;
      setMusicPlaybackState('playing');
      return;
    }

    if (musicPlaybackState === 'playing') {
      setMusicPlaybackState('paused');
    }
  };

  if (!cat) return null;

  const currentGoblin = GOBLINS[level - 1];
  const maxCaveIndex = 6;
  const caveImage = `cave${Math.min(level, maxCaveIndex)}`;
  const isOpponentPulseActive = turnPulse?.target === 'opponent';
  const isPlayerPulseActive = turnPulse?.target === 'player';
  const isCatDead = cat.hp <= 0;
  const levelClearedComment = LEVEL_CLEARED_COMMENTS[level] || "The goblin handled the cat. Fate handled your soul.";

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-zinc-200 font-sans relative overflow-hidden">
      <AnimatePresence>
        {catEdgeHitFlashId > 0 && (
          <motion.div
            key={catEdgeHitFlashId}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.2, 0.92, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26, ease: 'easeOut', times: [0, 0.14, 0.35, 0.62, 1] }}
            className="cat-hit-edge-flash pointer-events-none absolute inset-0 z-[58]"
          />
        )}
      </AnimatePresence>
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
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div
              className={cn(
                "px-4 py-2 rounded-xl border-2 font-black font-serif tracking-wide text-lg sm:text-xl whitespace-nowrap shadow-2xl",
                critRollIndicator.tone === 'hit'
                  ? "text-red-100 bg-red-900/90 border-red-300/80"
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
            <div className="w-[380px] max-w-[90vw] rounded-2xl border border-amber-300/70 bg-zinc-900/96 shadow-2xl p-6 flex flex-col items-center justify-center gap-4">
              <img
                src={potionPreview.icon}
                alt={potionPreview.name}
                className="w-[292px] h-[292px] max-w-[70vw] max-h-[50vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="w-full text-center space-y-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/90 font-semibold">{potionPreview.kind}</p>
                <h3 className="text-2xl leading-tight font-serif text-amber-100 font-bold">{potionPreview.name}</h3>
                <p className="text-zinc-100 text-base leading-relaxed font-semibold">{potionPreview.desc}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battlefield */}
      <main className="flex-1 min-h-0 flex flex-col p-2 gap-2 sm:gap-4 w-full z-10">
        
        {/* Opponent Area */}
        <motion.div
          animate={
            isOpponentPulseActive
              ? {
                  opacity: [1, 0.45, 1, 0.45, 1],
                  scale: [1.01, 1.06, 1.01, 1.06, 1.01],
                  boxShadow: [
                    '0 0 22px rgba(245,158,11,0.26), 0 0 36px rgba(245,158,11,0.16), inset 0 0 0 rgba(251,191,36,0)',
                    '0 0 40px rgba(251,191,36,0.72), 0 0 82px rgba(245,158,11,0.5), inset 0 0 24px rgba(254,240,138,0.24)',
                    '0 0 22px rgba(245,158,11,0.26), 0 0 36px rgba(245,158,11,0.16), inset 0 0 0 rgba(251,191,36,0)',
                    '0 0 40px rgba(251,191,36,0.72), 0 0 82px rgba(245,158,11,0.5), inset 0 0 24px rgba(254,240,138,0.24)',
                    '0 0 22px rgba(245,158,11,0.26), 0 0 36px rgba(245,158,11,0.16), inset 0 0 0 rgba(251,191,36,0)',
                  ],
                  filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)', 'brightness(1.2)', 'brightness(1)'],
                }
              : {
                  opacity: 1,
                  scale: turn === 'opponent' ? 1.01 : 1,
                  boxShadow: turn === 'opponent'
                    ? '0 0 30px rgba(245,158,11,0.25)'
                    : '0 0 0 rgba(0,0,0,0)',
                  filter: 'brightness(1)',
                }
          }
          transition={isOpponentPulseActive ? { duration: 2, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] } : { duration: 0.25, ease: 'easeOut' }}
          className={cn(
            "shrink-0 p-3 sm:p-4 rounded-2xl border-2 transition-all duration-500 flex items-center gap-4 relative overflow-hidden min-h-[110px]",
            turn === 'opponent' ? "border-amber-400 bg-amber-950/40" : "border-zinc-700 bg-zinc-900/70"
          )}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(120% 180% at 50% 50%, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0.08) 42%, rgba(0,0,0,0) 72%), linear-gradient(120deg, rgba(252,211,77,0) 0%, rgba(252,211,77,0.35) 45%, rgba(252,211,77,0) 70%)',
              mixBlendMode: 'screen',
            }}
            animate={isOpponentPulseActive ? { opacity: [0.2, 0.82, 0.26, 0.82, 0.2], x: ['-14%', '14%', '-8%', '12%', '0%'] } : { opacity: 0, x: '0%' }}
            transition={isOpponentPulseActive ? { duration: 2, ease: 'easeInOut' } : { duration: 0.25 }}
          />
          <motion.div
            aria-hidden
            className="absolute -inset-y-10 -left-20 w-24 pointer-events-none blur-xl"
            style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0) 0%, rgba(253,230,138,0.9) 50%, rgba(251,191,36,0) 100%)', mixBlendMode: 'screen' }}
            animate={isOpponentPulseActive ? { x: ['0%', '430%'], opacity: [0, 0.95, 0] } : { x: '0%', opacity: 0 }}
            transition={isOpponentPulseActive ? { duration: 2, ease: 'easeInOut' } : { duration: 0.2 }}
          />
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
            {(currentGoblin.atkBonus !== undefined || currentGoblin.dmgBonus !== undefined || currentGoblin.weapon || currentGoblin.minDamage !== undefined || currentGoblin.maxDamage !== undefined || currentGoblin.fixedDamage !== undefined) && (
              <div className="text-xs text-zinc-400 font-mono">
                {currentGoblin.weapon && <span className="mr-2">{currentGoblin.weapon}</span>}
                {currentGoblin.atkBonus !== undefined ? `Atk: ${currentGoblin.atkBonus >= 0 ? '+' : ''}${currentGoblin.atkBonus} ` : ''}
                {currentGoblin.dmgBonus !== undefined ? `Dmg: ${currentGoblin.dmgBonus >= 0 ? '+' : ''}${currentGoblin.dmgBonus} ` : ''}
                {currentGoblin.fixedDamage !== undefined ? `Dmg Fixed: ${currentGoblin.fixedDamage} ` : ''}
                {currentGoblin.minDamage !== undefined && currentGoblin.maxDamage !== undefined ? `Dmg Range: ${currentGoblin.minDamage}-${currentGoblin.maxDamage}` : ''}
              </div>
            )}
          </div>
        </motion.div>

        {/* The Cat */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1 sm:py-4 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent pointer-events-none" />
          
          <div
            className={cn(
              "bg-zinc-900/95 rounded-2xl shadow-2xl p-4 transform-gpu",
              isCatHitShaking && 'cat-hit-shake'
            )}
            style={{ perspective: 1200, transformStyle: 'preserve-3d', transformOrigin: '50% 50%' }}
          >
            <div className="cat-card-flip-shell w-[14rem] sm:w-[15.5rem] h-[20rem] sm:h-[22rem]">
              <div
                className="cat-card-flip-inner"
                style={{ transform: isCatDead ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                <div className="cat-card-face cat-card-face-front">
                  <div className="flex flex-col items-center gap-2 sm:gap-3 h-full justify-center">
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
                                ? "text-red-100 text-2xl sm:text-3xl bg-red-900/90 border-red-300/80 shadow-[0_0_24px_rgba(239,68,68,0.45)]"
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
                  </div>
                </div>
                <div className="cat-card-face cat-card-face-back">
                  <div className="cat-card-back-pattern rounded-xl w-full h-full p-3">
                    <div className="cat-card-back-frame rounded-lg w-full h-full flex items-center justify-center">
                      <img
                        src="/images/elements/items/skull.png"
                        alt="skull"
                        className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player Area Container */}
        <div className="flex flex-col gap-2 shrink-0 w-full mx-auto">
          {/* Potions Bar */}
          <div className="grid grid-cols-5 gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800 auto-rows-min">
            {availablePotions.map((potion) => (
              <div key={potion.id} className="w-full rounded flex flex-col items-center justify-start gap-1 px-1 min-h-0">
                <button
                  onClick={() => usePotion(potion)}
                  disabled={gameState !== 'playing'}
                  className={cn(
                    "flex flex-shrink-0 items-center justify-center transition-all bg-transparent",
                    gameState === 'playing' ? "hover:brightness-125 cursor-pointer active:scale-95" : "opacity-50 cursor-not-allowed"
                  )}
                  title={`${potion.name}: ${potion.desc}`}
                >
                  <img
                    src={potion.icon}
                    alt={potion.name}
                    className="w-10 h-10 object-contain flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                </button>
                <span className="text-[10px] sm:text-xs leading-tight text-zinc-100 font-semibold text-center whitespace-normal break-words flex-1">
                  {potion.desc}
                </span>
              </div>
            ))}
          </div>

          {/* Player Box */}
          <motion.div
            animate={
              isPlayerPulseActive
                ? {
                    opacity: [1, 0.45, 1, 0.45, 1],
                    scale: [1.02, 1.07, 1.02, 1.07, 1.02],
                    boxShadow: [
                      '0 0 14px rgba(245,158,11,0.22), 0 0 24px rgba(245,158,11,0.14), inset 0 0 0 rgba(251,191,36,0)',
                      '0 0 32px rgba(251,191,36,0.7), 0 0 64px rgba(245,158,11,0.45), inset 0 0 20px rgba(254,240,138,0.25)',
                      '0 0 14px rgba(245,158,11,0.22), 0 0 24px rgba(245,158,11,0.14), inset 0 0 0 rgba(251,191,36,0)',
                      '0 0 32px rgba(251,191,36,0.7), 0 0 64px rgba(245,158,11,0.45), inset 0 0 20px rgba(254,240,138,0.25)',
                      '0 0 14px rgba(245,158,11,0.22), 0 0 24px rgba(245,158,11,0.14), inset 0 0 0 rgba(251,191,36,0)',
                    ],
                    filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)', 'brightness(1.2)', 'brightness(1)'],
                  }
                : {
                    opacity: turn === 'player' ? 1 : 0.6,
                    scale: turn === 'player' ? 1.02 : 1,
                    boxShadow: turn === 'player'
                      ? '0 0 15px rgba(245,158,11,0.2)'
                      : '0 0 0 rgba(0,0,0,0)',
                    filter: 'brightness(1)',
                  }
            }
            transition={isPlayerPulseActive ? { duration: 2, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] } : { duration: 0.25, ease: 'easeOut' }}
            className={cn(
              "p-2 sm:p-3 rounded-lg border transition-all duration-500 flex items-center gap-3 relative overflow-hidden",
              turn === 'player' ? "border-amber-500 bg-amber-950/30" : "border-zinc-800 bg-zinc-900/50"
            )}
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(120% 180% at 50% 50%, rgba(251,191,36,0.32) 0%, rgba(251,191,36,0.07) 42%, rgba(0,0,0,0) 72%), linear-gradient(120deg, rgba(252,211,77,0) 0%, rgba(252,211,77,0.35) 45%, rgba(252,211,77,0) 70%)',
                mixBlendMode: 'screen',
              }}
              animate={isPlayerPulseActive ? { opacity: [0.2, 0.82, 0.26, 0.82, 0.2], x: ['-14%', '14%', '-8%', '12%', '0%'] } : { opacity: 0, x: '0%' }}
              transition={isPlayerPulseActive ? { duration: 2, ease: 'easeInOut' } : { duration: 0.25 }}
            />
            <motion.div
              aria-hidden
              className="absolute -inset-y-8 -left-20 w-20 pointer-events-none blur-lg"
              style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0) 0%, rgba(253,230,138,0.92) 50%, rgba(251,191,36,0) 100%)', mixBlendMode: 'screen' }}
              animate={isPlayerPulseActive ? { x: ['0%', '520%'], opacity: [0, 0.95, 0] } : { x: '0%', opacity: 0 }}
              transition={isPlayerPulseActive ? { duration: 2, ease: 'easeInOut' } : { duration: 0.2 }}
            />
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
                    ? "bg-red-600 hover:bg-red-500 text-white animate-pulse" 
                    : "bg-amber-600 hover:bg-amber-500 text-zinc-950"
                )}
              >
                <Sword className="w-4 h-4" />
                {rollPhase === 'waiting-d6' ? 'Roll Damage' : 'Roll to Hit'}
              </button>
            </div>
          </motion.div>
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
                  step="1"
                  value={Math.round(musicVolume * 100)}
                  onInput={(e) => applySliderVolume((e.target as HTMLInputElement).value)}
                  onChange={(e) => applySliderVolume(e.target.value)}
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
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[5px]" />

            <div
              className={cn(
                'relative z-10 w-full',
                gameState === 'levelComplete'
                  ? 'max-w-5xl h-full py-4 sm:py-6 flex flex-col items-center justify-between gap-4 sm:gap-6'
                  : 'max-w-md space-y-8'
              )}
            >
              {gameState === 'gameOver' && (
                <>
                  <h2 className="font-rpg text-5xl sm:text-6xl font-black text-red-500 drop-shadow-[0_6px_18px_rgba(239,68,68,0.35)]">You Lose</h2>
                  <div className="flex justify-center my-6">
                    <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center">
                      <img 
                        src={`/images/cats/cat_${level}.png`} 
                        alt={cat.name}
                        className="w-full h-full object-cover grayscale opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <p className="font-serif text-red-100 text-lg sm:text-2xl font-bold leading-relaxed tracking-wide bg-red-950/55 border border-red-400/55 rounded-xl px-4 py-3 shadow-[0_0_28px_rgba(239,68,68,0.3)]">
                    You killed {cat.name}. The guilt is unbearable.
                  </p>
                  {renderLeaderboardPanel()}
                  <button onClick={onExit} className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-sm font-rpg font-black text-2xl w-full transition-colors">
                    Main Menu
                  </button>
                </>
              )}
              
              {gameState === 'levelComplete' && (
                <>
                  <div className="w-full flex items-center justify-center text-amber-200/85 font-serif tracking-[0.22em] uppercase text-xs sm:text-sm">
                    Chapter {level} Chronicle Updated
                  </div>

                  <div className="w-full flex-1 min-h-0 flex items-center justify-center">
                    <img
                      src="/images/elements/levelcleared.png"
                      alt="Level Cleared"
                      className="w-auto h-[56dvh] sm:h-[62dvh] max-h-[70vh] object-contain drop-shadow-[0_24px_64px_rgba(245,158,11,0.45)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="w-full max-w-3xl rounded-2xl border border-amber-300/35 bg-gradient-to-b from-zinc-900/88 via-zinc-900/84 to-zinc-950/92 backdrop-blur-md px-4 py-4 sm:px-7 sm:py-6 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
                    <h2 className="font-rpg text-5xl sm:text-7xl font-black text-amber-300 leading-none tracking-wide drop-shadow-[0_6px_18px_rgba(251,191,36,0.35)]">Level Cleared</h2>
                    <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
                    <p className="font-serif mt-4 text-zinc-100 text-base sm:text-xl leading-relaxed tracking-normal">
                      {GOBLINS[level - 1].name} killed {cat.name}. {levelClearedComment}
                    </p>
                  </div>

                  <button onClick={() => startLevel(level + 1)} className="w-full max-w-xl px-8 py-4 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-sm font-rpg font-black text-2xl transition-colors flex items-center justify-center gap-2 shadow-[0_12px_38px_rgba(245,158,11,0.35)]">
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
      <audio ref={modifierAudioRef} src="/sounds/modificator.wav" preload="auto" />
      </div>
    </div>
  );
}
