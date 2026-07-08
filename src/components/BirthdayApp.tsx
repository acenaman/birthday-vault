import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { timeline, gallery, type TimelineItem } from "@/lib/media";

// ============ Utility: Confetti helpers ============
const heartShape = confetti.shapeFromPath({
  path: "M12 21s-7-4.5-9.5-9C.5 8 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3C21 4 23.5 8 21.5 12 19 16.5 12 21 12 21z",
});

function heartBurst(x = 0.5, y = 0.5) {
  confetti({
    particleCount: 80,
    spread: 90,
    origin: { x, y },
    colors: ["#e11d48", "#f472b6", "#fda4af", "#fbcfe8", "#fecdd3"],
    shapes: [heartShape, "circle"],
    scalar: 1.2,
    ticks: 220,
  });
}

function bigCelebration() {
  const end = Date.now() + 1500;
  const colors = ["#e11d48", "#f472b6", "#fda4af", "#fbcfe8", "#f9a8d4"];
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, shapes: [heartShape, "circle"] });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, shapes: [heartShape, "circle"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ============ Web audio helpers ============
function useAudioCtx() {
  const ref = useRef<AudioContext | null>(null);
  const get = () => {
    if (!ref.current && typeof window !== "undefined") {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      ref.current = new Ctx();
    }
    return ref.current!;
  };
  return get;
}

function playUnlockSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  // mechanical click
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 800);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = 0.4;
  src.connect(g).connect(ctx.destination);
  src.start(now);

  // chord chime
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = ctx.createOscillator();
    const gg = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    gg.gain.setValueAtTime(0.0001, now + 0.15 + i * 0.06);
    gg.gain.exponentialRampToValueAtTime(0.15, now + 0.2 + i * 0.06);
    gg.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    o.connect(gg).connect(ctx.destination);
    o.start(now + 0.15 + i * 0.06);
    o.stop(now + 1.6);
  });
}

// Ambient romantic pad using WebAudio
function useAmbientMusic() {
  const getCtx = useAudioCtx();
  const nodesRef = useRef<{ oscs: OscillatorNode[]; gain: GainNode } | null>(null);
  const [playing, setPlaying] = useState(false);

  const start = () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    if (nodesRef.current) return;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2);
    master.connect(ctx.destination);
    const notes = [261.63, 329.63, 392.0, 523.25]; // C major chord
    const oscs = notes.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? "sine" : "triangle";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      // slow LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + i * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start();
      o.connect(g).connect(master);
      o.start();
      return o;
    });
    nodesRef.current = { oscs, gain: master };
    setPlaying(true);
  };

  const stop = () => {
    const ctx = getCtx();
    if (!nodesRef.current) return;
    const { oscs, gain } = nodesRef.current;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    setTimeout(() => {
      oscs.forEach((o) => { try { o.stop(); } catch { /* noop */ } });
    }, 700);
    nodesRef.current = null;
    setPlaying(false);
  };

  const toggle = () => (playing ? stop() : start());
  return { playing, toggle };
}

// ============ Floating hearts background ============
export function FloatingHearts({ count = 14 }: { count?: number }) {
  const hearts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        size: 12 + Math.random() * 20,
        dur: 8 + Math.random() * 8,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute bottom-[-40px] text-rose-deep/50 animate-float-heart"
          style={{
            left: `${h.left}%`,
            fontSize: `${h.size}px`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.dur}s`,
          }}
        >
          ♥
        </div>
      ))}
    </div>
  );
}

// ============ Countdown ============
// Target: July 10, 2026 00:00 IST => 2026-07-09T18:30:00Z
const TARGET_TS = Date.UTC(2026, 6, 9, 18, 30, 0);

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, TARGET_TS - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { diff, days, hours, minutes, seconds, unlocked: diff === 0 };
}

const TEASING = [
  "Patience, Bavni! Good things come to those who wait... 🤫",
  "No peeking, Bubbu! The vault is completely sealed.",
  "Meraa bchhhaa, you have to wait for the clock to strike 12! ⏳",
  "Are you trying to break in, Tidddee Pkodeee? Nice try! 😂",
  "Almost there, Barfi... the vault knows your birthday 💌",
];

// ============ Phase 1: Vault ============
export function VaultPhase({ onUnlock }: { onUnlock: () => void }) {
  const { days, hours, minutes, seconds, unlocked } = useCountdown();
  const [msgIdx, setMsgIdx] = useState(0);
  const [opening, setOpening] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<number | null>(null);
  const getCtx = useAudioCtx();

  useEffect(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % TEASING.length), 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (unlocked && !opening) triggerOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const triggerOpen = () => {
    if (opening) return;
    setOpening(true);
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    playUnlockSound(ctx);
    setTimeout(() => bigCelebration(), 700);
    setTimeout(() => onUnlock(), 1800);
  };

  // Secret: double-click lock icon
  const handleLockTap = () => {
    setTapCount((c) => c + 1);
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setTapCount(0), 500);
    if (tapCount + 1 >= 2) {
      setTapCount(0);
      triggerOpen();
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const units: Array<[string, number]> = [
    ["Days", days],
    ["Hours", hours],
    ["Minutes", minutes],
    ["Seconds", seconds],
  ];

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-center text-4xl font-semibold text-gradient-rose sm:text-5xl"
        style={{ fontFamily: "var(--font-script)" }}
      >
        A Vault of Love
      </motion.h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Sealed for the world's most special girl 💌
      </p>

      {/* Countdown */}
      <div className="glass mb-6 grid w-full grid-cols-4 gap-2 rounded-2xl p-4">
        {units.map(([label, val]) => (
          <div key={label} className="text-center">
            <div className="text-3xl font-bold text-rose-deep sm:text-4xl">{pad(val)}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Vault */}
      <div className="relative aspect-square w-full max-w-sm">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-rose-gold/40 to-rose-deep/20 blur-2xl" />
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-rose-gold/50 bg-gradient-to-br from-blush to-cream shadow-2xl">
          {/* Back interior */}
          <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-rose-deep/20 to-rose-gold/10">
            <div className="flex h-full items-center justify-center">
              {opening && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-6xl"
                >
                  💖
                </motion.div>
              )}
            </div>
          </div>
          {/* Left door */}
          <div
            className={`absolute inset-y-2 left-2 w-1/2 rounded-l-2xl border-r border-rose-gold/60 bg-gradient-to-br from-rose-soft via-blush to-rose-gold/60 shadow-inner ${opening ? "swing-left" : ""}`}
          >
            <div className="absolute right-2 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full bg-rose-deep/60" />
            <div className="absolute inset-4 rounded-xl border border-rose-gold/40" />
          </div>
          {/* Right door */}
          <div
            className={`absolute inset-y-2 right-2 w-1/2 rounded-r-2xl border-l border-rose-gold/60 bg-gradient-to-bl from-rose-soft via-blush to-rose-gold/60 shadow-inner ${opening ? "swing-right" : ""}`}
          >
            <div className="absolute left-2 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full bg-rose-deep/60" />
            <div className="absolute inset-4 rounded-xl border border-rose-gold/40" />
            {/* Lock */}
            <button
              onClick={handleLockTap}
              className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-rose-gold to-rose-deep p-4 shadow-lg animate-shimmer"
              aria-label="Vault lock"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Teasing rotating text */}
      <div className="mt-6 min-h-[3rem] text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="text-base italic text-rose-deep sm:text-lg"
          >
            {TEASING[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Secret bypass button in corner */}
      <button
        onClick={triggerOpen}
        className="fixed bottom-2 right-2 z-50 rounded-full bg-white/40 px-2 py-1 text-[10px] text-muted-foreground/50 backdrop-blur hover:text-rose-deep"
        aria-label="Developer bypass"
      >
        ✦ skip
      </button>
    </div>
  );
}

// ============ Phase 2: Gift Unwrap ============
export function GiftPhase({ onOpen }: { onOpen: () => void }) {
  const [opening, setOpening] = useState(false);
  const handle = () => {
    if (opening) return;
    setOpening(true);
    heartBurst(0.5, 0.5);
    bigCelebration();
    setTimeout(() => onOpen(), 1400);
  };
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-8 text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-2 text-3xl text-gradient-rose sm:text-4xl"
        style={{ fontFamily: "var(--font-script)" }}
      >
        A little something for you...
      </motion.h2>
      <p className="mb-8 text-sm text-muted-foreground">Tap the gift to unwrap ✨</p>

      <motion.button
        onClick={handle}
        animate={opening ? { scale: [1, 1.4, 0], rotate: [0, 15, -15, 0] } : { y: [0, -10, 0] }}
        transition={opening ? { duration: 1.2 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative h-48 w-48 sm:h-56 sm:w-56"
      >
        {/* box body */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 rounded-2xl bg-gradient-to-br from-rose-deep to-rose-gold shadow-2xl" />
        {/* lid */}
        <div className="absolute inset-x-0 top-0 h-1/4 rounded-2xl bg-gradient-to-br from-rose-gold to-rose-deep shadow-lg" />
        {/* vertical ribbon */}
        <div className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-b from-cream to-blush" />
        {/* horizontal ribbon */}
        <div className="absolute inset-x-0 top-[22%] h-6 bg-gradient-to-r from-cream to-blush" />
        {/* bow */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 text-5xl">🎀</div>
      </motion.button>
    </div>
  );
}

// ============ Cake ============
function Cake({ onComplete }: { onComplete: () => void }) {
  const [candlesOut, setCandlesOut] = useState(false);
  const [cut, setCut] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const startX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const handleStart = (x: number) => { startX.current = x; };
  const handleMove = (x: number) => {
    if (startX.current == null || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const rel = Math.max(0, Math.min(rect.width, x - rect.left));
    setDragX(rel);
    if (rel > rect.width * 0.85 && !cut) doCut();
  };
  const handleEnd = () => { startX.current = null; };

  const doCut = () => {
    setCut(true);
    setShowBanner(true);
    heartBurst(0.5, 0.4);
    setTimeout(() => onComplete(), 400);
    setTimeout(() => setShowBanner(false), 3500);
  };

  return (
    <div className="glass mx-auto max-w-md rounded-3xl p-6">
      <h3 className="mb-4 text-center text-2xl text-gradient-rose">Make a Wish 🎂</h3>
      <div className="relative mx-auto h-64 w-64">
        {/* plate */}
        <div className="absolute bottom-0 left-1/2 h-4 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b from-rose-gold/60 to-rose-deep/30 shadow-lg" />
        {/* bottom layer */}
        <div className="absolute bottom-4 left-1/2 h-20 w-56 -translate-x-1/2 rounded-xl bg-gradient-to-b from-blush to-rose-soft shadow-inner">
          <div className="absolute inset-x-2 top-2 flex justify-between text-rose-deep">
            {"❤ ❤ ❤ ❤ ❤".split(" ").map((c, i) => <span key={i}>{c}</span>)}
          </div>
        </div>
        {/* top layer */}
        <div className="absolute bottom-24 left-1/2 h-16 w-40 -translate-x-1/2 rounded-xl bg-gradient-to-b from-cream to-blush shadow-inner">
          {/* Drips */}
          <div className="absolute -bottom-2 left-2 right-2 flex justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-3 rounded-b-full bg-gradient-to-b from-rose-gold to-rose-deep/70" />
            ))}
          </div>
        </div>
        {/* dotted slicing line */}
        {!cut && (
          <div
            ref={trackRef}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            className="absolute left-1/2 top-24 z-10 h-24 w-56 -translate-x-1/2 cursor-grab touch-none"
            style={{ background: "linear-gradient(to right, transparent, transparent)" }}
          >
            <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 border-t-2 border-dashed border-rose-deep/70" />
            <div
              className="absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white text-xl shadow-lg flex items-center justify-center"
              style={{ left: `${dragX}px`, transform: `translate(-50%, -50%)` }}
            >
              🔪
            </div>
          </div>
        )}
        {cut && (
          <motion.div
            initial={{ x: 0, rotate: 0 }}
            animate={{ x: -60, rotate: -8 }}
            className="absolute bottom-4 left-[10%] h-20 w-16 rounded-l-xl bg-gradient-to-b from-blush to-rose-soft shadow"
          />
        )}
        {/* candles */}
        <div className="absolute bottom-40 left-1/2 flex -translate-x-1/2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative">
              <div className="h-8 w-2 rounded-sm bg-gradient-to-b from-rose-gold to-rose-deep" />
              {!candlesOut ? (
                <div className="absolute -top-4 left-1/2 h-4 w-3 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-400 via-yellow-300 to-white animate-flicker" />
              ) : (
                <div className="absolute -top-3 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-gray-400/40 blur-sm" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button
          className="btn-rose"
          onClick={() => {
            setCandlesOut(true);
            heartBurst(0.5, 0.6);
          }}
          disabled={candlesOut}
        >
          {candlesOut ? "Wish made ✨" : "Blow out candles"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {cut ? "Cake cut! Enjoy, my love 💖" : "Now drag along the dotted line to cut →"}
      </p>

      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="mx-4 rounded-3xl bg-gradient-to-br from-rose-deep to-rose-gold px-8 py-6 text-center shadow-2xl">
              <h2 className="text-3xl text-white sm:text-5xl" style={{ fontFamily: "var(--font-script)" }}>
                Happy Birthday My World!
              </h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Timeline ============
function MediaBox({ item, className = "" }: { item: TimelineItem; className?: string }) {
  if (item.type === "video") {
    return (
      <video
        src={item.url}
        className={`h-full w-full object-cover ${className}`}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return <img src={item.url} alt={item.title} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
}

function Timeline() {
  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-6 text-center text-3xl text-gradient-rose">Our Journey ✨</h3>
      <div className="relative pl-8">
        <div className="absolute bottom-0 left-3 top-0 w-0.5 bg-gradient-to-b from-rose-gold via-rose-deep to-rose-gold shadow-[0_0_10px_rgba(225,29,72,0.5)]" />
        {timeline.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="relative mb-8"
          >
            <div className="absolute -left-[22px] top-3 h-4 w-4 rounded-full bg-rose-deep shadow-[0_0_12px_rgba(225,29,72,0.7)] ring-4 ring-cream" />
            <div className="glass overflow-hidden rounded-2xl">
              <div className="aspect-video w-full overflow-hidden bg-blush">
                <MediaBox item={item} />
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-muted-foreground">Chapter {i + 1}</div>
                <div className="text-lg font-semibold text-rose-deep">{item.title}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============ Gallery ============
function Gallery() {
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() > 0.5) heartBurst(Math.random(), 0.3 + Math.random() * 0.4);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto max-w-2xl">
      <h3 className="mb-6 text-center text-3xl text-gradient-rose">Moments 📸</h3>
      <div className="relative">
        <div className="columns-2 gap-3 sm:columns-3">
          {gallery.map((item, i) => (
            <div
              key={i}
              className="mb-3 break-inside-avoid overflow-hidden rounded-2xl shadow-lg"
              style={{ height: `${180 + (i % 3) * 60}px` }}
            >
              <MediaBox item={item} />
            </div>
          ))}
        </div>
        {/* Overlay center card */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="rotate-[-4deg] rounded-2xl bg-gradient-to-br from-rose-deep to-rose-gold px-6 py-4 text-center shadow-2xl"
          >
            <p className="text-lg font-bold text-white sm:text-2xl" style={{ fontFamily: "var(--font-script)" }}>
              Bchh gyee aapp saarii nii daalii mainee 💕
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============ Reasons popper ============
const REASONS = [
  "Because you laugh at my worst jokes, Barfi 🥰",
  "You’re my calm in every storm, Bhalu 🐻",
  "That smile — deadly weapon, Penguu 🐧",
  "You make ordinary days magical, Myy Babyyy 💫",
  "Your hugs literally recharge me, Bavni 🔋",
  "The way you say my name, Bubbu 💌",
  "You’re my favorite chaos, Tidddee Pkodeee 🌪",
  "Every silence with you is peace, Meraa bchhhaa ☁",
  "You make me a better version of me 💖",
  "Because ‘us’ is my favorite word 💞",
];

function Reasons() {
  const [current, setCurrent] = useState<string | null>(null);
  const tap = () => {
    const r = REASONS[Math.floor(Math.random() * REASONS.length)];
    setCurrent(r);
    heartBurst(0.5, 0.6);
  };
  return (
    <div className="glass mx-auto max-w-md rounded-3xl p-6 text-center">
      <h3 className="mb-4 text-2xl text-gradient-rose">Reasons I Love You 💌</h3>
      <button onClick={tap} className="btn-rose">Tap for a Sweet Memory</button>
      <AnimatePresence mode="wait">
        {current && (
          <motion.p
            key={current}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 text-lg italic text-rose-deep"
          >
            “{current}”
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Coupons ============
const COUPONS = [
  { icon: "🤗", title: "One Free Hug", note: "Redeem anytime, unlimited stock." },
  { icon: "🍦", title: "Late Night Ice Cream", note: "Whatever flavor you want." },
  { icon: "🕊️", title: "No Fighting Pass", note: "Use wisely, valid once a month." },
  { icon: "🎬", title: "Movie Night", note: "Your pick, my company." },
  { icon: "💐", title: "Surprise Flowers", note: "On the day you least expect." },
  { icon: "📞", title: "3 AM Call", note: "For every 'I can't sleep' night." },
];

function Coupons() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-6 text-center text-3xl text-gradient-rose">Love Coupons 🎫</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {COUPONS.map((c, i) => {
          const isFlipped = flipped.has(i);
          return (
            <button
              key={i}
              onClick={() => {
                setFlipped((s) => {
                  const n = new Set(s);
                  if (n.has(i)) n.delete(i); else { n.add(i); heartBurst(0.5, 0.7); }
                  return n;
                });
              }}
              className="relative aspect-[3/4] w-full"
              style={{ perspective: "1000px" }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-rose-deep to-rose-gold p-3 text-white shadow-lg"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="text-3xl">💝</div>
                  <div className="mt-2 text-xs opacity-90">Tap to reveal</div>
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-cream to-blush p-3 text-center text-rose-deep shadow-lg"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="text-3xl">{c.icon}</div>
                  <div className="mt-1 text-sm font-bold">{c.title}</div>
                  <div className="mt-1 text-[10px] opacity-80">{c.note}</div>
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ Letter ============
function Letter() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="glass rounded-3xl p-6 sm:p-10">
        <h3 className="mb-4 text-center text-3xl text-gradient-rose" style={{ fontFamily: "var(--font-script)" }}>
          From my heart, to yours
        </h3>
        <div className="space-y-4 text-[15px] leading-relaxed text-foreground/85">
          <p>
            My love, if I sat down to write everything you mean to me, I'd fill a hundred notebooks
            and still forget to mention the way your eyes disappear when you laugh.
          </p>
          <p>
            You are the calm in my chaos, the silly in my serious, and the reason my heart still
            skips a beat when my phone lights up with your name. Every random "raula", every long
            drive, every stolen moment — I'd relive them all in a heartbeat.
          </p>
          <p>
            Thank you for choosing me, again and again. For loving me on my loud days and my quiet
            ones. For being the softest, safest place I know.
          </p>
        </div>
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-rose-deep to-rose-gold p-6 text-center text-white shadow-xl">
          <p className="text-xl font-semibold sm:text-2xl" style={{ fontFamily: "var(--font-script)" }}>
            Happy Birthday to the one who rules my heart.
          </p>
          <p className="mt-2 text-base sm:text-lg">I love you forever, My World. 💖</p>
        </div>
      </div>
    </div>
  );
}

// ============ Pep Talk ============
function PepTalk() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="glass rounded-3xl p-6 sm:p-8">
        <h3 className="mb-4 text-center text-2xl text-gradient-rose">
          A Quick Reality Check for My Bhalu 👑
        </h3>
        <p className="text-[15px] leading-relaxed text-foreground/85">
          Listen up, <b>Meraa bchhhaa</b>. Look how far we’ve come! From the start of our raula to
          literally everything else, it’s 100% God’s plan. The universe knew what it was doing when
          it paired us up. We’ve cracked milestones, handled the chaos, and honestly? There’s SO
          much more to go, so many more crazy memories to unlock. You're doing amazing, and I'm
          right here riding shotgun through it all. Now stop stressing, smile, and let's crush
          another year together! 🚀❤️
        </p>
      </div>
    </div>
  );
}

// ============ Quiz ============
const QUIZ = [
  {
    q: "Where did we have our first proper conversation?",
    options: ["School corridor", "On call at night", "At the mela", "In a random DM"],
    correct: 1,
  },
  {
    q: "Who is the bigger Tidddee Pkodeee?",
    options: ["Me, obviously", "You, 100%", "Both equally", "The universe"],
    correct: 1,
  },
  {
    q: "Our first movie together was watched...",
    options: ["At home", "In a theatre", "On a laptop", "On a phone"],
    correct: 1,
  },
  {
    q: "Best day of our journey (so far) is...",
    options: ["First Meet", "Trip", "LPU day", "Every day with you"],
    correct: 3,
  },
];

function Quiz() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const answer = (i: number) => {
    const q = QUIZ[idx];
    if (i === q.correct) {
      setScore((s) => s + 1);
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#f472b6", "#fda4af", "#fbcfe8", "#e11d48"],
      });
      setTimeout(next, 700);
    } else {
      setAlert("Wrong answer, Barfi! Try again or I'm revoking your coupons! 😂");
    }
  };
  const next = () => {
    if (idx + 1 >= QUIZ.length) setDone(true);
    else setIdx((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-md">
      <h3 className="mb-4 text-center text-2xl text-gradient-rose">How Well Do You Know Us? 🧠💘</h3>
      <div className="glass rounded-3xl p-6">
        {done ? (
          <div className="text-center">
            <div className="text-5xl">🏆</div>
            <p className="mt-2 text-lg text-rose-deep">Score: {score} / {QUIZ.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {score === QUIZ.length ? "Perfect. As expected of my girl 💖" : "Still my favorite person, always."}
            </p>
            <button className="btn-rose mt-4" onClick={() => { setIdx(0); setScore(0); setDone(false); }}>Play again</button>
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">Question {idx + 1} / {QUIZ.length}</div>
            <p className="mt-2 text-lg font-semibold text-rose-deep">{QUIZ[idx].q}</p>
            <div className="mt-4 grid gap-2">
              {QUIZ[idx].options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  className="rounded-xl border border-rose-gold/40 bg-white/60 px-4 py-3 text-left text-sm text-foreground transition hover:border-rose-deep hover:bg-blush"
                >
                  {o}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-4 top-6 z-50 mx-auto max-w-md rounded-2xl bg-gradient-to-r from-rose-deep to-rose-gold p-4 text-center text-white shadow-2xl"
            onAnimationComplete={() => setTimeout(() => setAlert(null), 2200)}
          >
            {alert}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Marquee ============
function Marquee() {
  const text = "Happy Birthday Barfi! 🎉 • I Love You Penguu 🐧 • HBD My World 🌍 • Stay Blessed Myy Babyyy 💖 • Happy Birthday Tidddee Pkodeee! 🥳 • Endless Love for Bubbu ✨ • ";
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-rose-deep to-rose-gold py-4">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="px-4 text-lg font-semibold text-white">{text.repeat(4)}</span>
        <span className="px-4 text-lg font-semibold text-white">{text.repeat(4)}</span>
      </div>
    </div>
  );
}

// ============ Music toggle ============
function MusicButton() {
  const { playing, toggle } = useAmbientMusic();
  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-rose-deep to-rose-gold text-xl text-white shadow-lg animate-shimmer"
      aria-label="Toggle music"
    >
      {playing ? "🎵" : "🔇"}
    </button>
  );
}

// ============ Celebration (main) ============
export function CelebrationPhase() {
  return (
    <div className="relative z-10">
      <MusicButton />

      <section className="px-4 py-10 text-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-5xl text-gradient-rose sm:text-7xl"
          style={{ fontFamily: "var(--font-script)" }}
        >
          Happy Birthday, My World
        </motion.h1>
        <p className="mt-3 text-sm text-muted-foreground">A little celebration, made just for you 💖</p>
      </section>

      <section className="px-4 py-6">
        <Cake onComplete={() => heartBurst(0.5, 0.5)} />
      </section>

      <section className="px-4 py-10">
        <Timeline />
      </section>

      <section className="px-4 py-10">
        <Gallery />
      </section>

      <section className="grid gap-8 px-4 py-10 md:grid-cols-2">
        <Reasons />
        <Coupons />
      </section>

      <section className="px-4 py-10">
        <Letter />
      </section>

      <section className="px-4 py-10">
        <PepTalk />
      </section>

      <section className="px-4 py-10">
        <Quiz />
      </section>

      <Marquee />
    </div>
  );
}

// ============ Root orchestrator ============
export default function BirthdayApp() {
  const [phase, setPhase] = useState<"vault" | "gift" | "celebration">("vault");

  return (
    <div className="relative min-h-screen">
      <FloatingHearts count={phase === "celebration" ? 16 : 10} />
      <AnimatePresence mode="wait">
        {phase === "vault" && (
          <motion.div key="vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VaultPhase onUnlock={() => setPhase("gift")} />
          </motion.div>
        )}
        {phase === "gift" && (
          <motion.div key="gift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GiftPhase onOpen={() => setPhase("celebration")} />
          </motion.div>
        )}
        {phase === "celebration" && (
          <motion.div key="cel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CelebrationPhase />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
