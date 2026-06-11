import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Bot, User, Cpu, Radio, History, Plus, X, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROS Agent — Autonomous Robotics Assistant" },
      {
        name: "description",
        content:
          "A cinematic ROS agent chat. Ask anything — autonomous agents handle the work for you.",
      },
      { property: "og:title", content: "ROS Agent" },
      {
        property: "og:description",
        content: "Cinematic chat interface for an autonomous ROS agent.",
      },
    ],
  }),
  component: Index,
});

type Message = { role: "user" | "agent"; content: string; id: string };

// ============================================================
// ROS AGENT BACKEND INTEGRATION
// FastAPI server exposing:
//   GET    /api/health
//   POST   /api/chat       body: ChatRequest  -> ChatResponse
//   GET    /api/memory
//   DELETE /api/memory
//
// UPDATE this base URL to point at your FastAPI server.
// e.g. "http://127.0.0.1:8000" or your deployed host.
// You can also define VITE_API_BASE in a .env file for local development.
// ============================================================
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function callBackend(prompt: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt }),
    });
    if (!res.ok) {
      throw new Error(`Backend ${res.status}`);
    }
    const data = await res.json();
    return data.reply ?? data.response ?? data.message ?? "(empty response)";
  } catch (err) {
    return `⚠ Backend unreachable at ${API_BASE}/api/chat. (${(err as Error).message})`;
  }
}

// Optional helpers — wire these into UI buttons when you need them.
// GET /api/health
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
// GET /api/memory
export async function getMemory(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/memory`);
  return res.json();
}
// DELETE /api/memory
export async function clearMemory(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/memory`, { method: "DELETE" });
  return res.ok;
}


const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    resultsRef.current?.scrollTo({
      top: resultsRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;
    setMessages((m) => [...m, { role: "user", content: prompt, id: uid() }]);
    setInput("");
    setLoading(true);
    const reply = await callBackend(prompt);
    setMessages((m) => [...m, { role: "agent", content: reply, id: uid() }]);
    setLoading(false);
    inputRef.current?.focus();
  }

  function jumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 600, easing: "ease-out" });
    setHistoryOpen(false);
  }

  function clearSession() {
    setMessages([]);
    setHistoryOpen(false);
    inputRef.current?.focus();
  }

  const prompts = messages.filter((m) => m.role === "user");

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <AmbientBackground />

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        prompts={prompts}
        onJump={jumpTo}
        onClear={clearSession}
      />

      <main className="relative z-10 mx-auto flex h-screen w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-5">
        <Header
          onOpenHistory={() => setHistoryOpen(true)}
          onNewChat={clearSession}
          count={prompts.length}
        />

        <section
          ref={resultsRef}
          className="min-h-0 flex-1 overflow-y-auto py-3 sm:py-4 [scrollbar-width:thin]"
        >
          {messages.length === 0 && !loading ? (
            <HeroIntro />
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </AnimatePresence>
              {loading && <TypingIndicator />}
            </div>
          )}
        </section>

        <Composer
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          inputRef={inputRef}
          loading={loading}
        />

        <p className="mt-2 text-center text-[10px] tracking-wide text-muted-foreground/60">
          ROS Agent · Autonomous robotics runtime · v0.1
        </p>
      </main>
    </div>
  );
}

function HistoryPanel({
  open,
  onClose,
  prompts,
  onJump,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  prompts: Message[];
  onJump: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[85vw] flex-col border-r border-border bg-card/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <h2 className="text-sm font-semibold tracking-tight">Session history</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close history"
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-3 pt-3">
              <button
                onClick={onClear}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                New chat
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
              {prompts.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <MessageSquare className="mb-3 h-6 w-6 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    No prompts yet. Your session history will appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {prompts.map((p, i) => (
                    <li key={p.id}>
                      <button
                        onClick={() => onJump(p.id)}
                        className="group flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="mt-0.5 w-6 shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="line-clamp-2 text-foreground/90 group-hover:text-foreground">
                          {p.content}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
              {prompts.length} prompt{prompts.length === 1 ? "" : "s"} this session
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Header({
  onOpenHistory,
  onNewChat,
  count,
}: {
  onOpenHistory: () => void;
  onNewChat: () => void;
  count: number;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenHistory}
          aria-label="Open session history"
          className="relative grid h-8 w-8 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-accent"
        >
          <History className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background">
              {count}
            </span>
          )}
        </button>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">ROS Agent</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            online
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <Radio className="h-3 w-3" /> /cmd_vel
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3" /> nav2
          </span>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>
    </motion.header>
  );
}

function HeroIntro() {
  const line1 = "You don't need to do anything.";
  const line2 = "Agents will do the work for you.";
  return (
    <div className="flex h-full flex-col items-center justify-start pt-2 text-center sm:pt-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-3 sm:mb-5"
      >
        <RobotMark />
      </motion.div>

      <h1 className="font-display text-balance text-2xl font-medium leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
        <CinematicLine text={line1} delay={0.3} />
        <br />
        <CinematicLine text={line2} delay={0.3 + line1.length * 0.025} dim />
      </h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="mt-3 max-w-md text-xs text-muted-foreground sm:mt-5 sm:text-sm"
      >
        Describe a mission. The ROS agent plans, navigates, and reports back.
      </motion.p>
    </div>
  );
}

function CinematicLine({
  text,
  delay = 0,
  dim = false,
}: {
  text: string;
  delay?: number;
  dim?: boolean;
}) {
  return (
    <span className={dim ? "text-muted-foreground" : "text-foreground"}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: delay + i * 0.025,
            duration: 0.5,
            ease: [0.2, 0.7, 0.2, 1],
          }}
          className="inline-block"
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex scroll-mt-24 items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border ${
          isUser ? "bg-foreground text-background" : "bg-card"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm border-foreground bg-foreground text-background"
            : "rounded-tl-sm border-border bg-card text-card-foreground"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3"
    >
      <div className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-foreground"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function Composer({
  input,
  setInput,
  onSubmit,
  inputRef,
  loading,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e?: FormEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const typing = input.trim().length > 0;

  // Three intensity tiers: rest -> focused -> typing
  const intensity = typing ? 2 : focused ? 1 : 0;

  const shellShadow = [
    // rest
    "inset 0 1px 0 0 rgba(255,255,255,1), inset 0 -1px 0 0 rgba(0,0,0,0.04), 0 1px 2px 0 rgba(0,0,0,0.04), 0 10px 20px -8px rgba(0,0,0,0.10), 0 24px 48px -20px rgba(0,0,0,0.14)",
    // focused
    "inset 0 1px 0 0 rgba(255,255,255,1), inset 0 -1px 0 0 rgba(0,0,0,0.05), 0 2px 4px 0 rgba(0,0,0,0.06), 0 16px 32px -10px rgba(0,0,0,0.16), 0 36px 70px -22px rgba(0,0,0,0.22)",
    // typing
    "inset 0 1px 0 0 rgba(255,255,255,1), inset 0 -1px 0 0 rgba(0,0,0,0.06), 0 3px 6px 0 rgba(0,0,0,0.08), 0 22px 42px -10px rgba(0,0,0,0.20), 0 46px 90px -24px rgba(0,0,0,0.28)",
  ][intensity];

  const dropOpacity = [0.06, 0.09, 0.12][intensity];
  const dropOpacity2 = [0.04, 0.06, 0.09][intensity];
  const dropY = [0, 2, 4][intensity];

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="relative mx-auto mt-4 w-full max-w-2xl sm:mt-6"
    >
      {/* 3D stacked layers — animate softly with focus/typing */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 -bottom-2 h-10 rounded-3xl bg-foreground blur-xl"
        animate={{ opacity: dropOpacity, y: dropY }}
        transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -bottom-5 h-8 rounded-3xl bg-foreground blur-2xl"
        animate={{ opacity: dropOpacity2, y: dropY * 1.5 }}
        transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[26px] bg-gradient-to-b from-white to-transparent opacity-80"
      />
      <motion.div
        className="group relative flex items-end gap-3 rounded-3xl border bg-gradient-to-b from-white to-[oklch(0.97_0_0)] p-3 pl-5"
        animate={{
          boxShadow: shellShadow,
          borderColor: focused
            ? "oklch(0.12 0 0 / 0.6)"
            : "oklch(0.9 0 0 / 1)",
          y: -intensity * 1.5,
        }}
        transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          placeholder="Command the ROS agent… (Enter to send)"
          className="min-h-[68px] max-h-40 flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:text-base"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foreground text-background transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:scale-100"
          style={{
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 -2px 0 0 rgba(0,0,0,0.4), 0 6px 14px -2px rgba(0,0,0,0.25), 0 2px 4px 0 rgba(0,0,0,0.1)",
          }}
          aria-label="Send"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </motion.div>
    </motion.form>
  );
}

/* ---------------- visual: robot mark ---------------- */
function RobotMark() {
  return (
    <div className="relative h-24 w-24">
      <motion.div
        className="absolute inset-0 rounded-full border border-border"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
      </motion.div>
      <motion.div
        className="absolute inset-3 rounded-full border border-border/60"
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 translate-x-1/2 rounded-full bg-muted-foreground" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 grid place-items-center"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card">
          <Bot className="h-6 w-6" />
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------- ambient background ---------------- */
function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_85%)]" />

      {/* floating orbits left */}
      <FloatingOrbit className="left-[-120px] top-[18%]" size={300} duration={28} />
      <FloatingOrbit className="left-[6%] bottom-[8%]" size={140} duration={20} reverse />

      {/* right side */}
      <FloatingOrbit className="right-[-100px] top-[10%]" size={220} duration={24} reverse />
      <FloatingOrbit className="right-[8%] bottom-[18%]" size={180} duration={32} />

      {/* behind: scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
        initial={{ top: "10%" }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* corner brackets */}
      <Bracket className="left-4 top-4" />
      <Bracket className="right-4 top-4 rotate-90" />
      <Bracket className="left-4 bottom-4 -rotate-90" />
      <Bracket className="right-4 bottom-4 rotate-180" />
    </div>
  );
}

function FloatingOrbit({
  className = "",
  size = 200,
  duration = 24,
  reverse = false,
}: {
  className?: string;
  size?: number;
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <motion.div
      className={`absolute ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <div className="relative h-full w-full rounded-full border border-border/40">
        <div className="absolute inset-4 rounded-full border border-border/30" />
        <div className="absolute inset-10 rounded-full border border-border/20" />
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50" />
        <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 translate-x-1/2 rounded-full bg-foreground/30" />
      </div>
    </motion.div>
  );
}

function Bracket({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute h-6 w-6 border-l border-t border-foreground/30 ${className}`}
    />
  );
}
