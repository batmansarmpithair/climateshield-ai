import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform
} from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ShieldAlert,
  ArrowRight,
  Cpu,
  Activity,
  CheckCircle2,
  ChevronRight,
  Layers,
  Zap,
  Waves,
  Flame,
  Wind,
  Sun,
  Database,
  Gauge,
  Boxes,
  ClipboardCheck
} from "lucide-react";

interface LandingPageProps {
  onLaunch: () => void;
  onSelectScenario: (scenarioId: string) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Animates 0 -> target with easeOutCubic once `active` is true. */
function useCountUp(target: number, duration: number, active: boolean, linear = false): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = linear ? p : 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active, linear]);
  return value;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = (delay = 0.12): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: 0.1 } }
});

const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <motion.div
    className={className}
    variants={fadeUp}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-80px" }}
  >
    {children}
  </motion.div>
);

const GradientText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-100 to-zinc-200">
    {children}
  </span>
);

/** Count-up number that starts when scrolled into view. */
const StatNumber: React.FC<{ value: number; suffix?: string; ready: boolean }> = ({ value, suffix = "", ready }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const n = useCountUp(value, 1800, ready && inView);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Background radar with recurring threat pop-ups                      */
/* ------------------------------------------------------------------ */

const THREAT_TYPES = [
  { label: "Flood Alert", color: "#ef4444", chip: "border-red-500/50 text-red-300 bg-red-950/70" },
  { label: "Heatwave", color: "#f59e0b", chip: "border-amber-500/50 text-amber-300 bg-amber-950/70" },
  { label: "Cyclone", color: "#a3a3a3", chip: "border-zinc-300/50 text-zinc-100 bg-zinc-900/70" },
  { label: "Drought", color: "#fb923c", chip: "border-orange-500/50 text-orange-300 bg-orange-950/70" },
  { label: "Embankment Breach", color: "#f43f5e", chip: "border-rose-500/50 text-rose-300 bg-rose-950/70" },
  { label: "Storm Surge", color: "#d4d4d4", chip: "border-zinc-300/50 text-zinc-100 bg-zinc-900/70" }
];

const DISTRICTS = ["Kamrup", "Barmer", "Puri", "Kutch", "Cachar", "Patna", "Idukki", "Jodhpur", "Khordha", "Barpeta", "Surat", "Thrissur"];

interface Threat {
  id: number;
  x: number; // % within radar box
  y: number;
  type: (typeof THREAT_TYPES)[number];
  place: string;
  sev: number;
}

const RadarBackground: React.FC<{ active: boolean }> = ({ active }) => {
  const [threats, setThreats] = useState<Threat[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const spawn = () => {
      // random point inside the circle (polar coords, keep away from exact centre)
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.18 + Math.random() * 0.34;
      const t: Threat = {
        id: ++idRef.current,
        x: 50 + Math.cos(ang) * rad * 100,
        y: 50 + Math.sin(ang) * rad * 100,
        type: THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)],
        place: DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)],
        sev: 60 + Math.floor(Math.random() * 38)
      };
      setThreats((prev) => [...prev.slice(-5), t]);
      setTimeout(() => setThreats((prev) => prev.filter((p) => p.id !== t.id)), 4200);
    };
    spawn();
    const iv = setInterval(spawn, 1300);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="relative w-[min(1000px,140vh)] aspect-square">
        {/* rings + crosshair */}
        <div className="absolute inset-0 rounded-full border border-zinc-300/20 bg-zinc-300/[0.03]" />
        <div className="absolute inset-[14%] rounded-full border border-zinc-300/15" />
        <div className="absolute inset-[28%] rounded-full border border-zinc-300/15" />
        <div className="absolute inset-[42%] rounded-full border border-zinc-300/10" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-300/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-300/10" />
        <div className="absolute inset-0 rounded-full [background:repeating-conic-gradient(from_0deg,rgba(255,255,255,0.06)_0deg_0.5deg,transparent_0.5deg_15deg)] [mask-image:radial-gradient(circle,transparent_8%,black_9%,black_70%,transparent_71%)]" />

        {/* expanding radar pulse */}
        {[0, 1.8, 3.6].map((d) => (
          <motion.div
            key={d}
            className="absolute inset-0 rounded-full border border-zinc-200/30"
            initial={{ scale: 0.05, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 5.4, delay: d, repeat: Infinity, ease: "easeOut" }}
          />
        ))}

        {/* sweep */}
        <motion.div
          className="absolute inset-0 rounded-full [background:conic-gradient(from_0deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08)_14%,transparent_30%)] [mask-image:radial-gradient(circle,black_69%,transparent_71%)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />

        {/* threat pop-ups */}
        <AnimatePresence>
          {threats.map((t) => (
            <motion.div
              key={t.id}
              className="absolute"
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <span className="relative flex h-3 w-3 -translate-x-1/2 -translate-y-1/2">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full"
                  style={{ background: t.type.color }}
                  animate={{ scale: [1, 4.5], opacity: [0.7, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                />
                <span className="relative inline-flex h-3 w-3 rounded-full" style={{ background: t.type.color, boxShadow: `0 0 12px ${t.type.color}` }} />
              </span>
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={`absolute left-3 -top-3 whitespace-nowrap rounded-md border px-2 py-1 backdrop-blur-sm ${t.type.chip}`}
              >
                <div className="text-[9px] font-bold uppercase tracking-wider leading-none">{t.type.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5 leading-none">
                  {t.place} &middot; Risk {t.sev}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Static content                                                      */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {
    icon: Activity,
    title: "Multi-Hazard Engine",
    color: "cyan",
    text: "Standardized 0-100 scoring modeling floods, heatwaves, droughts, and cyclones across India, accounting for demographic vulnerability and infrastructure deficits."
  },
  {
    icon: Zap,
    title: "Time-Series Forecaster",
    color: "indigo",
    text: "Regularized autoregressive ridge regression projecting 24h, 48h, and 72h risk trajectories with empirical confidence intervals on temporal holdouts."
  },
  {
    icon: Cpu,
    title: "PuLP MILP Optimizer",
    color: "teal",
    text: "Mixed-integer solver deciding what to move, from where, to where, how much, and at what cost, while enforcing donor reserves and budget caps."
  },
  {
    icon: CheckCircle2,
    title: "Explainable Workflow",
    color: "emerald",
    text: "Plain-language rationale for every transfer, with a full draft & approval lifecycle, atomic inventory tracking and audit logging."
  }
] as const;

const COLOR_MAP: Record<string, string> = {
  cyan: "text-zinc-200 bg-zinc-900/80 border-zinc-700/60 group-hover:shadow-zinc-300/20",
  indigo: "text-zinc-200 bg-zinc-900/80 border-zinc-700/60 group-hover:shadow-zinc-300/20",
  teal: "text-zinc-200 bg-zinc-900/80 border-zinc-700/60 group-hover:shadow-zinc-300/20",
  emerald: "text-emerald-400 bg-emerald-950/80 border-emerald-800/60 group-hover:shadow-emerald-500/20"
};

const FLOW = [
  { icon: Database, n: "01", title: "Ingestion", sub: "Synthetic Climate Telemetry", text: "Rainfall, temp, wind, humidity across 28 states & 8 UTs.", color: "text-zinc-200" },
  { icon: Gauge, n: "02", title: "Assessment", sub: "Multi-Hazard Risk Engine", text: "Normalized 0-100 hazard scores, vulnerability and exposed population.", color: "text-zinc-200" },
  { icon: Boxes, n: "03", title: "Demand Synthesis", sub: "Emergency Requirements", text: "Pumps, boats, trauma kits, shelters and water tankers.", color: "text-zinc-200" },
  { icon: Cpu, n: "04", title: "Optimization", sub: "PuLP Mathematical Solver", text: "Minimizes unmet demand & delay while preserving donor reserves.", color: "text-zinc-200" },
  { icon: ClipboardCheck, n: "05", title: "Execution", sub: "Commander Approval", text: "Atomically updates stock and writes to immutable audit history.", color: "text-emerald-400" }
];

const SCENARIOS = [
  { id: "assam-flood", icon: Waves, title: "Assam Flood Emergency", hazard: "Floods & Brahmaputra Deluge", glow: "from-zinc-300/20", border: "hover:border-zinc-300", desc: "Kamrup, Cachar, Barpeta facing embankment breaches. Critical demand for dewatering pumps & boats." },
  { id: "rajasthan-heatwave", icon: Sun, title: "Rajasthan Heatwave & Drought", hazard: "Extreme Heat Dome (48 deg C+)", glow: "from-amber-500/20", border: "hover:border-amber-500", desc: "Thar desert drinking water deficit across Barmer & Jodhpur. Massive demand for mobile water tankers." },
  { id: "gujarat-cyclone", icon: Wind, title: "Gujarat Cyclone Preparation", hazard: "Category 4 Arabian Sea Cyclone", glow: "from-zinc-300/20", border: "hover:border-zinc-300", desc: "Approaching Saurashtra coast. Staging NDRF battalions, inflatable motorboats & emergency shelters." },
  { id: "monsoon-emergency", icon: Flame, title: "Multi-State Monsoon Crisis", hazard: "Compounding Inter-Regional Floods", glow: "from-zinc-300/20", border: "hover:border-zinc-300", desc: "Simultaneous deluges in Assam, Bihar, Kerala & Odisha triggering national supply contention." }
];

const TICKER = [
  "Multi-Hazard Risk Scoring",
  "72h Ridge Forecasts",
  "MILP Resource Optimization",
  "28 States & 8 UTs",
  "Explainable Recommendations",
  "Commander Approval Workflow",
  "Immutable Audit Trail"
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onSelectScenario }) => {
  // Loading screen removed: landing content (and its animations) start immediately.
  const bootDone = true;

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressBar = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });

  // Mouse parallax for the radar
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const onMove = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  const heroGlowX = useTransform(mx, [-1, 1], [-40, 40]);
  const heroGlowY = useTransform(my, [-1, 1], [-30, 30]);

  return (
    <>
      <div ref={scrollRef} className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-zinc-100 scroll-smooth">
        {/* scroll progress */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[3px] origin-left z-50 bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-300"
          style={{ scaleX: progressBar }}
        />

        {/* Nav */}
        <motion.nav
          initial={{ y: -60, opacity: 0 }}
          animate={bootDone ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="sticky top-0 z-40 flex items-center justify-between px-6 lg:px-12 h-16 bg-[#0a0a0a]/70 backdrop-blur-xl border-b border-zinc-800/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-200 via-zinc-200 to-zinc-400 p-[1.5px]">
              <div className="w-full h-full rounded-[10px] bg-[#111111] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-zinc-100" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-none">
                Climate<GradientText>Shield</GradientText> <span className="text-xs font-mono px-1 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">AI</span>
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {/* Elegant Mini Indian Flag */}
                <span
                  className="inline-flex flex-col w-3.5 h-2.5 rounded-[2px] overflow-hidden border border-zinc-700 shadow-sm shrink-0"
                  title="Republic of India"
                >
                  <span className="h-1/3 bg-[#FF9933] w-full" />
                  <span className="h-1/3 bg-white w-full flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full border-[0.5px] border-[#000080]" />
                  </span>
                  <span className="h-1/3 bg-[#138808] w-full" />
                </span>
                <span className="text-[10px] text-zinc-400 font-medium tracking-wide">
                  India Disaster Intelligence
                </span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#pillars" className="hover:text-zinc-100 transition-colors">Pillars</a>
            <a href="#flow" className="hover:text-zinc-100 transition-colors">How it works</a>
            <a href="#scenarios" className="hover:text-zinc-100 transition-colors">Scenarios</a>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={onLaunch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-zinc-200 to-zinc-200 text-zinc-950 text-sm font-bold cursor-pointer"
          >
            Launch App <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.nav>

        {/* Hero */}
        <section onMouseMove={onMove} className="relative overflow-hidden px-6 lg:px-12 min-h-[calc(100vh-4rem)] flex items-center">
          <div className="absolute inset-0 pointer-events-none opacity-[0.05] [background-image:linear-gradient(to_right,#d4d4d4_1px,transparent_1px),linear-gradient(to_bottom,#d4d4d4_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          <motion.div style={{ x: heroGlowX, y: heroGlowY }} className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full bg-zinc-300/15 blur-[130px] pointer-events-none" />
          <motion.div style={{ x: heroGlowY, y: heroGlowX }} className="absolute -bottom-48 right-0 w-[560px] h-[560px] rounded-full bg-zinc-400/15 blur-[130px] pointer-events-none" />

          {/* Radar animation in the background with recurring threat pop-ups */}
          <RadarBackground active={bootDone} />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0.82)_0%,rgba(10,10,10,0.55)_32%,transparent_62%)]" />

          <motion.div
            variants={stagger(0.13)}
            initial="hidden"
            animate={bootDone ? "show" : "hidden"}
            className="relative z-10 max-w-3xl mx-auto text-center py-16"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-600/40 text-zinc-100 text-[10px] font-semibold uppercase tracking-[0.2em] mb-5 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              National Disaster Decision Support
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
              Move resources <GradientText>before the storm.</GradientText>
            </motion.h1>

            <motion.p variants={fadeUp} className="max-w-xl mx-auto text-zinc-400 text-sm leading-relaxed mb-7">
              ClimateShield forecasts multi-hazard risk across all 28 states &amp; 8 Union Territories and uses MILP optimization to pre-position pumps, boats, rescue teams and supplies where lives are most at risk.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-9">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onLaunch}
                className="group relative flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-zinc-200 to-zinc-200 text-zinc-950 font-semibold text-xs shadow-lg shadow-zinc-300/30 cursor-pointer overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                <span className="relative">Launch Command Center</span>
                <ArrowRight className="relative w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectScenario("assam-flood")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 backdrop-blur border border-zinc-700 hover:border-zinc-400 hover:text-zinc-100 text-zinc-200 font-medium text-xs transition-colors cursor-pointer"
              >
                Explore Assam Flood Emergency
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </motion.button>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 max-w-md mx-auto sm:divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur">
              {[
                { v: 82, s: "", l: "Districts" },
                { v: 36, s: "", l: "States & UTs" },
                { v: 4, s: "", l: "Hazard Types" },
                { v: 72, s: "h", l: "Forecast Window" }
              ].map((s) => (
                <div key={s.l} className="px-3 py-3 text-center">
                  <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-100">
                    <StatNumber value={s.v} suffix={s.s} ready={bootDone} />
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Ticker */}
        <div className="relative border-y border-zinc-800/80 bg-zinc-900/30 py-4 overflow-hidden">
          <motion.div
            className="flex gap-12 whitespace-nowrap w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-12 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                {t}
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300/70" />
              </span>
            ))}
          </motion.div>
        </div>

        {/* Pillars */}
        <section id="pillars" className="max-w-6xl mx-auto py-24 px-6">
          <Reveal className="text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-200 mb-3">System Pillars</h2>
            <h3 className="text-3xl sm:text-4xl font-black">
              From meteorological signals to <GradientText>tactical convoys</GradientText>
            </h3>
          </Reveal>

          <motion.div
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {PILLARS.map((p) => (
              <motion.div
                key={p.title}
                variants={fadeUp}
                whileHover={{ y: -8 }}
                className="group relative p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 transition-shadow group-hover:shadow-lg ${COLOR_MAP[p.color]}`}>
                  <p.icon className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">{p.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Flow */}
        <section id="flow" className="max-w-6xl mx-auto pb-24 px-6">
          <Reveal className="text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-200 mb-3 flex items-center justify-center gap-2">
              <Layers className="w-4 h-4" /> Platform Operational Flow
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black">
              Five steps from <GradientText>data to decision</GradientText>
            </h3>
          </Reveal>

          <div className="relative">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              className="hidden lg:block absolute top-6 left-[10%] right-[10%] h-px origin-left bg-gradient-to-r from-zinc-300/60 via-zinc-300/60 to-emerald-500/60"
            />
            <motion.div
              variants={stagger(0.18)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
            >
              {FLOW.map((f) => (
                <motion.div key={f.n} variants={fadeUp} whileHover={{ y: -6 }} className="relative text-center">
                  <div className="relative mx-auto w-12 h-12 rounded-full bg-[#111111] border border-zinc-700 flex items-center justify-center mb-4 z-10">
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div className={`font-mono text-xs font-bold ${f.color}`}>{f.n} &middot; {f.title}</div>
                  <p className="text-sm text-zinc-200 font-semibold mt-1">{f.sub}</p>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{f.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Scenarios */}
        <section id="scenarios" className="max-w-6xl mx-auto pb-24 px-6">
          <Reveal className="text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-200 mb-3">Live Scenarios</h2>
            <h3 className="text-3xl sm:text-4xl font-black">
              Explore <GradientText>demonstration scenarios</GradientText>
            </h3>
          </Reveal>

          <motion.div
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {SCENARIOS.map((s) => (
              <motion.button
                key={s.id}
                variants={fadeUp}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectScenario(s.id)}
                className={`group relative overflow-hidden p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 ${s.border} text-left transition-colors cursor-pointer flex flex-col justify-between min-h-[250px]`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <s.icon className="w-7 h-7 text-zinc-100 mb-4" />
                  <span className="text-[11px] font-semibold text-zinc-200 font-mono">{s.hazard}</span>
                  <h4 className="text-base font-bold text-white mt-1 mb-2">{s.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
                <div className="relative mt-5 flex items-center gap-1 text-xs font-semibold text-zinc-100">
                  <span>Load Scenario</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1.5" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-24">
          <Reveal>
            <div className="relative max-w-4xl mx-auto overflow-hidden rounded-3xl border border-zinc-700/40 bg-gradient-to-br from-zinc-900/60 via-[#121212] to-zinc-900/50 p-10 sm:p-14 text-center">
              <motion.div
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-zinc-200/20 blur-[100px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <h3 className="relative text-3xl sm:text-4xl font-black mb-4">
                Ready to run the <GradientText>command center?</GradientText>
              </h3>
              <p className="relative text-zinc-400 mb-8 max-w-xl mx-auto">
                Open the live dashboard and watch the optimizer reallocate resources in real time.
              </p>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                onClick={onLaunch}
                className="relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-zinc-200 to-zinc-200 text-zinc-950 font-bold shadow-lg shadow-zinc-300/30 cursor-pointer"
              >
                Launch Command Center <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-zinc-800/80 py-8 px-6 text-center text-xs text-zinc-500">
          ClimateShield &mdash; decision-support prototype using a reproducible synthetic climate dataset. Not live IMD/NDMA data.
        </footer>
      </div>
    </>
  );
};

