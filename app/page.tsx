"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  FileAudio,
  FolderOpen,
  Library,
  LoaderCircle,
  LogOut,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import {
  outputKinds,
  outputLabels,
  type Memory,
  type OutputKind,
  type Project,
  type Suggestion,
  type User,
} from "@/lib/types";

type Session = {
  user: Omit<User, "passwordHash"> | null;
  counts?: { projects: number; memories: number };
  oneVoice?: { configured: boolean; active: boolean; mindsId?: string };
};
type View =
  "studio" | "projects" | "library" | "onevoice" | "settings" | "pricing";
const btn =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-px disabled:hover:translate-y-0";
const primary = `${btn} bg-brand text-[#201526] hover:brightness-105`;
const secondary = `${btn} border border-line bg-panel text-ink hover:bg-[color-mix(in_srgb,var(--panel)_85%,var(--brand))]`;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || body.message || response.statusText);
  return body as T;
}
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-xl bg-brand text-[#211727]">
        <Sparkles size={17} fill="currentColor" />
      </span>
      <span className="text-lg font-bold tracking-tight">reword</span>
    </div>
  );
}
function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium ${className || ""}`}>
      {label}
      <input
        {...props}
        className="focus-ring rounded-xl border border-line bg-surface px-3.5 py-3 text-ink placeholder:text-muted/60"
      />
    </label>
  );
}
function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string },
) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {props.label}
      <textarea
        {...props}
        className={`focus-ring min-h-28 resize-y rounded-xl border border-line bg-surface px-3.5 py-3 leading-6 text-ink placeholder:text-muted/60 ${props.className || ""}`}
      />
    </label>
  );
}
function Notice({
  children,
  tone = "normal",
}: {
  children: React.ReactNode;
  tone?: "normal" | "error" | "success";
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-sm ${tone === "error" ? "border-red-400/30 bg-red-500/10 text-red-500" : tone === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-600" : "border-brand/30 bg-brand/10 text-ink"}`}
    >
      {children}
    </div>
  );
}

function Auth({ reload }: { reload: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#0c0d0f] p-12 text-white lg:flex lg:flex-col">
        <Logo />
        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-brand">
            Your voice, everywhere
          </p>
          <h1 className="text-6xl font-semibold leading-[1.02] tracking-[-.055em]">
            Speak once.
            <br />
            Show up everywhere.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-white/55">
            Turn a single recording into platform-ready content that still
            sounds unmistakably like you.
          </p>
          <div className="mt-10 flex gap-5 text-sm text-white/55">
            <span>4 formats</span>
            <span>•</span>
            <span>OneVoice memory</span>
            <span>•</span>
            <span>You stay in control</span>
          </div>
        </div>
        <div className="absolute -bottom-40 -right-28 size-[34rem] rounded-full bg-brand/25 blur-[110px]" />
      </section>
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md enter">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <p className="text-sm font-semibold text-brand">
            {mode === "signup" ? "Start creating" : "Welcome back"}
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-.04em]">
            {mode === "signup" ? "Create your account" : "Sign in to Reword"}
          </h2>
          <p className="mt-3 text-muted">
            {mode === "signup"
              ? "Build your voice profile in a few minutes."
              : "Your ideas are waiting."}
          </p>
          <form onSubmit={submit} className="mt-8 grid gap-4">
            {mode === "signup" && (
              <Field
                label="Name"
                name="name"
                placeholder="Alex Morgan"
                required
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
            {error && <Notice tone="error">{error}</Notice>}
            <button disabled={busy} className={`${primary} mt-2 h-12`}>
              {busy && <LoaderCircle className="animate-spin" size={17} />}{" "}
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <i className="h-px flex-1 bg-line" />
            OR
            <i className="h-px flex-1 bg-line" />
          </div>
          <a href="/api/auth/google" className={`${secondary} h-12 w-full`}>
            <span className="font-bold text-blue-500">G</span> Continue with
            Google
          </a>
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
            }}
            className="mt-6 w-full text-sm text-muted hover:text-ink"
          >
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "New to Reword? Create an account"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Onboarding({
  user,
  reload,
}: {
  user: NonNullable<Session["user"]>;
  reload: () => void;
}) {
  const [step, setStep] = useState(0),
    [data, setData] = useState({
      name: user.name,
      niche: "",
      audience: "",
      tone: "Warm, clear, and conversational",
      writingSample: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const fields = [
    {
      title: "What do you create?",
      copy: "This helps OneVoice understand your world.",
      key: "niche" as const,
      label: "Creator niche",
      placeholder: "e.g. Leadership, fitness, personal finance",
    },
    {
      title: "Who are you speaking to?",
      copy: "Describe the people you want your ideas to reach.",
      key: "audience" as const,
      label: "Target audience",
      placeholder: "e.g. First-time founders building small teams",
    },
    {
      title: "How should you sound?",
      copy: "Choose a tone that feels natural to you.",
      key: "tone" as const,
      label: "Preferred tone",
      placeholder: "Warm, clear, and conversational",
    },
    {
      title: "Give us a sample of you.",
      copy: "Paste something you wrote. OneVoice uses it as a visible, editable memory.",
      key: "writingSample" as const,
      label: "Writing sample",
      placeholder: "Paste at least a few sentences...",
    },
  ];
  const current = fields[step];
  async function finish() {
    setBusy(true);
    setError("");
    try {
      await api("/api/onboarding", {
        method: "POST",
        body: JSON.stringify(data),
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl enter">
        <Logo />
        <div className="mt-12 flex gap-2">
          {fields.map((_, i) => (
            <i
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`}
            />
          ))}
        </div>
        <p className="mt-10 text-sm font-semibold text-brand">
          Step {step + 1} of {fields.length}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">
          {current.title}
        </h1>
        <p className="mt-3 text-muted">{current.copy}</p>
        <div className="mt-8">
          {current.key === "writingSample" ? (
            <TextArea
              label={current.label}
              value={data[current.key]}
              placeholder={current.placeholder}
              onChange={(e) =>
                setData({ ...data, [current.key]: e.target.value })
              }
              className="min-h-44"
            />
          ) : (
            <Field
              label={current.label}
              value={data[current.key]}
              placeholder={current.placeholder}
              onChange={(e) =>
                setData({ ...data, [current.key]: e.target.value })
              }
            />
          )}
        </div>
        {error && (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className={secondary}
          >
            <ArrowLeft size={16} /> Back
          </button>
          {step < fields.length - 1 ? (
            <button
              disabled={data[current.key].trim().length < 2}
              onClick={() => setStep(step + 1)}
              className={primary}
            >
              Continue
            </button>
          ) : (
            <button
              disabled={busy || data.writingSample.trim().length < 20}
              onClick={finish}
              className={primary}
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}{" "}
              Build my OneVoice
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Sidebar({
  view,
  setView,
  user,
  onLogout,
  open,
  setOpen,
}: {
  view: View;
  setView: (v: View) => void;
  user: NonNullable<Session["user"]>;
  onLogout: () => void;
  open: boolean;
  setOpen: (x: boolean) => void;
}) {
  const items: [View, string, typeof Mic][] = [
    ["studio", "Studio", Mic],
    ["projects", "Projects", FolderOpen],
    ["library", "Library", Library],
    ["onevoice", "OneVoice", WandSparkles],
    ["settings", "Settings", Settings],
  ];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-30 grid size-10 place-items-center rounded-xl border border-line bg-panel lg:hidden"
      >
        <Menu size={19} />
      </button>
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-panel p-5 transition lg:static ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={() => setOpen(false)} className="lg:hidden">
            <X size={18} />
          </button>
        </div>
        <button
          onClick={() => {
            setView("studio");
            setOpen(false);
          }}
          className={`${primary} mt-9 justify-start`}
        >
          <Plus size={17} /> New project
        </button>
        <nav className="mt-7 grid gap-1">
          {items.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => {
                setView(key);
                setOpen(false);
              }}
              className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${view === key ? "bg-brand/15 text-ink" : "text-muted hover:bg-surface hover:text-ink"}`}
            >
              <Icon
                size={17}
                className={view === key ? "text-brand" : "text-muted"}
              />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-brand/25 text-xs font-bold">
              {user.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">Free plan</p>
            </div>
            <button
              title="Sign out"
              onClick={onLogout}
              className="text-muted hover:text-ink"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Studio({ onOpen }: { onOpen: (p: Project) => void }) {
  const [mode, setMode] = useState<"choose" | "review">("choose"),
    [title, setTitle] = useState("Untitled idea"),
    [transcript, setTranscript] = useState(""),
    [source, setSource] = useState<Project["sourceType"]>("text"),
    [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const recognition = useRef<{
    start(): void;
    stop(): void;
    continuous: boolean;
    interimResults: boolean;
    onresult: (e: any) => void;
    onerror: (e: any) => void;
  } | null>(null);
  function record() {
    setError("");
    if (recording) {
      recognition.current?.stop();
      setRecording(false);
      return;
    }
    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setError(
        "Live transcription is not supported in this browser. Upload audio or paste a transcript.",
      );
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++)
        if (event.results[i].isFinal)
          text += event.results[i][0].transcript + " ";
      setTranscript((v) => v + text);
    };
    r.onerror = () => {
      setRecording(false);
      setError("Recording stopped. You can continue editing the transcript.");
    };
    recognition.current = r;
    r.start();
    setSource("recording");
    setRecording(true);
    setMode("review");
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("audio", file);
      const data = await api<{ transcript: string }>("/api/transcribe", {
        method: "POST",
        body: form,
      });
      setTranscript(data.transcript);
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setSource("upload");
      setMode("review");
    } catch (e) {
      setError((e as Error).message);
      setSource("upload");
      setMode("review");
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const { project } = await api<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ title, transcript, sourceType: source }),
      });
      onOpen(project);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl p-6 pt-20 lg:p-12">
      <div className="enter">
        <p className="text-sm font-semibold text-brand">
          Create something worth sharing
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
          Capture a thought<span className="text-brand">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Record naturally, upload an audio file, or start from a transcript.
          You’ll review every word before generation.
        </p>
      </div>
      {mode === "choose" ? (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <button
            onClick={record}
            className="group min-h-64 rounded-3xl border border-line bg-panel p-7 text-left transition hover:-translate-y-1 hover:border-brand/50"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-brand text-[#211727]">
              <Mic size={21} />
            </span>
            <h2 className="mt-16 text-2xl font-semibold">Record in Reword</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Live browser transcription keeps the flow immediate.
            </p>
          </button>
          <label className="group min-h-64 cursor-pointer rounded-3xl border border-dashed border-line bg-panel p-7 transition hover:-translate-y-1 hover:border-brand">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand">
              <Upload size={21} />
            </span>
            <h2 className="mt-16 text-2xl font-semibold">Upload audio</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              MP3, M4A, WAV, WebM, or another common audio format.
            </p>
            <input
              className="sr-only"
              type="file"
              accept="audio/*"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <button
            onClick={() => {
              setSource("text");
              setMode("review");
            }}
            className="md:col-span-2 text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            Already have a transcript? Paste it instead
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-3xl border border-line bg-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Review transcript</p>
                <p className="mt-1 text-xs text-muted">
                  Edit anything before generating.
                </p>
              </div>
              {source === "recording" && (
                <button
                  onClick={record}
                  className={
                    recording ? `${btn} bg-red-500 text-white` : `${secondary}`
                  }
                >
                  <span
                    className={
                      recording
                        ? "size-2 animate-pulse rounded-full bg-white"
                        : ""
                    }
                  />
                  {recording ? "Stop recording" : "Continue recording"}
                </button>
              )}
            </div>
            <Field
              label="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-6"
            />
            <div className="mt-5">
              <TextArea
                label="Transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your transcript will appear here. You can also paste or type it."
                className="min-h-72"
              />
            </div>
            {busy && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                <LoaderCircle className="animate-spin" size={16} /> Transcribing
                audio…
              </div>
            )}
            {error && (
              <div className="mt-4">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
          </section>
          <aside className="rounded-3xl border border-line bg-panel p-5">
            <p className="text-sm font-semibold">Ready?</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Reword will create exactly four editable formats using your
              approved OneVoice memories.
            </p>
            <button
              onClick={create}
              disabled={busy || !transcript.trim() || !title.trim()}
              className={`${primary} mt-6 w-full`}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}{" "}
              Create project
            </button>
            <button
              onClick={() => setMode("choose")}
              className="mt-3 w-full text-sm text-muted hover:text-ink"
            >
              Choose another source
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

function Editor({ initial, onBack }: { initial: Project; onBack: () => void }) {
  const [p, setP] = useState(initial),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const loadSuggestions = useCallback(
    () =>
      api<{ suggestions: Suggestion[]; memories: Memory[] }>("/api/memories")
        .then((x) => setSuggestions(x.suggestions))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);
  async function generate(kind?: OutputKind) {
    setBusy(kind || "all");
    setError("");
    try {
      await api(`/api/projects/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ transcript: p.transcript, title: p.title }),
      });
      const data = await api<{ outputs: Partial<Record<OutputKind, string>> }>(
        `/api/projects/${p.id}/generate`,
        { method: "POST", body: JSON.stringify({ kind }) },
      );
      setP((v) => ({ ...v, outputs: { ...v.outputs, ...data.outputs } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function saveChanges(markSaved = p.saved) {
    setBusy("save");
    try {
      await api(`/api/projects/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: p.title,
          transcript: p.transcript,
          outputs: p.outputs,
          saved: markSaved,
        }),
      });
      setP((v) => ({ ...v, saved: markSaved }));
      await loadSuggestions();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function exportText() {
    const text = [
      p.title,
      `Transcript\n${p.transcript}`,
      ...outputKinds.map((k) => `${outputLabels[k]}\n${p.outputs[k] || ""}`),
    ].join("\n\n---\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${p.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "reword"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function actSuggestion(id: string, action: "approve" | "dismiss") {
    await api(`/api/suggestions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    setSuggestions((v) => v.filter((s) => s.id !== id));
  }
  return (
    <div className="mx-auto max-w-6xl p-6 pt-20 lg:p-10">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to projects
      </button>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <input
          aria-label="Project title"
          value={p.title}
          onChange={(e) => setP({ ...p, title: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-3xl font-semibold tracking-[-.035em] outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => saveChanges(true)}
            className={p.saved ? secondary : primary}
          >
            {busy === "save" ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}{" "}
            {p.saved ? "Save changes" : "Save to library"}
          </button>
          <button onClick={exportText} className={secondary}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-5">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {suggestions.map((s) => (
        <div
          key={s.id}
          className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-brand/30 bg-brand/10 p-4 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-sm font-semibold">
              Teach OneVoice this preference?
            </p>
            <p className="mt-1 text-sm text-muted">{s.content}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => actSuggestion(s.id, "dismiss")}
              className={secondary}
            >
              Not now
            </button>
            <button
              onClick={() => actSuggestion(s.id, "approve")}
              className={primary}
            >
              <Check size={15} /> Remember
            </button>
          </div>
        </div>
      ))}
      <section className="mt-7 rounded-3xl border border-line bg-panel p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Transcript</h2>
            <p className="mt-1 text-xs text-muted">
              The source of truth for every format.
            </p>
          </div>
          <button
            onClick={() => generate()}
            disabled={Boolean(busy)}
            className={primary}
          >
            {busy === "all" ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            Generate all four
          </button>
        </div>
        <TextArea
          aria-label="Transcript source"
          value={p.transcript}
          onChange={(e) => setP({ ...p, transcript: e.target.value })}
          className="mt-5 min-h-44"
        />
      </section>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {outputKinds.map((kind) => (
          <section
            key={kind}
            className="rounded-3xl border border-line bg-panel p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{outputLabels[kind]}</h2>
              <div className="flex gap-1">
                <button
                  title="Copy"
                  onClick={() =>
                    navigator.clipboard.writeText(p.outputs[kind] || "")
                  }
                  disabled={!p.outputs[kind]}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                >
                  <Clipboard size={16} />
                </button>
                <button
                  title="Regenerate only this format"
                  onClick={() => generate(kind)}
                  disabled={Boolean(busy) || !p.transcript.trim()}
                  className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                >
                  {busy === kind ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
              </div>
            </div>
            <textarea
              aria-label={outputLabels[kind]}
              value={p.outputs[kind] || ""}
              onChange={(e) =>
                setP({
                  ...p,
                  outputs: { ...p.outputs, [kind]: e.target.value },
                })
              }
              placeholder="Generate this format to begin…"
              className="scrollbar mt-4 min-h-72 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-sm leading-6 outline-none focus:border-brand"
            />
          </section>
        ))}
      </div>
    </div>
  );
}

function ProjectList({
  libraryOnly,
  onOpen,
}: {
  libraryOnly: boolean;
  onOpen: (p: Project) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const x = await api<{ projects: Project[] }>("/api/projects");
      setProjects(x.projects);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function action(
    p: Project,
    type: "rename" | "duplicate" | "delete" | "regenerate",
  ) {
    try {
      if (type === "rename") {
        const title = prompt("Rename project", p.title);
        if (title?.trim())
          await api(`/api/projects/${p.id}`, {
            method: "PATCH",
            body: JSON.stringify({ title: title.trim() }),
          });
      }
      if (type === "duplicate")
        await api(`/api/projects/${p.id}/duplicate`, {
          method: "POST",
          body: "{}",
        });
      if (type === "delete" && confirm(`Delete “${p.title}”?`))
        await api(`/api/projects/${p.id}`, { method: "DELETE" });
      if (type === "regenerate") {
        await api(`/api/projects/${p.id}/generate`, {
          method: "POST",
          body: "{}",
        });
        const refreshed = await api<{ project: Project }>(
          `/api/projects/${p.id}`,
        );
        onOpen(refreshed.project);
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const shown = libraryOnly ? projects.filter((p) => p.saved) : projects;
  return (
    <div className="mx-auto max-w-6xl p-6 pt-20 lg:p-12">
      <p className="text-sm font-semibold text-brand">
        {libraryOnly ? "Saved and ready" : "Everything you are shaping"}
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">
        {libraryOnly ? "Content Library" : "Projects"}
        <span className="text-brand">.</span>
      </h1>
      <p className="mt-3 text-muted">
        {libraryOnly
          ? "Only projects you explicitly save appear here."
          : "Drafts and saved projects, all in one place."}
      </p>
      {error && (
        <div className="mt-5">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {busy ? (
        <div className="mt-16 flex justify-center">
          <LoaderCircle className="animate-spin text-brand" />
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line p-14 text-center">
          <Archive className="mx-auto text-muted" />
          <h2 className="mt-4 font-semibold">
            {libraryOnly ? "Nothing saved yet" : "No projects yet"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {libraryOnly
              ? "Open a project and select Save to library."
              : "Start in Studio with a recording, upload, or transcript."}
          </p>
        </div>
      ) : (
        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <article
              key={p.id}
              className="group rounded-3xl border border-line bg-panel p-5 transition hover:-translate-y-1 hover:border-brand/40"
            >
              <button onClick={() => onOpen(p)} className="w-full text-left">
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand/15 text-brand">
                    <FileAudio size={18} />
                  </span>
                  {p.saved && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                      Saved
                    </span>
                  )}
                </div>
                <h2 className="mt-7 truncate text-lg font-semibold">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {p.transcript || "No transcript yet"}
                </p>
                <p className="mt-5 text-xs text-muted">
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </p>
              </button>
              <div className="mt-5 flex border-t border-line pt-3">
                <button
                  title="Rename"
                  onClick={() => action(p, "rename")}
                  className="grid size-9 place-items-center text-muted hover:text-ink"
                >
                  <Pencil size={15} />
                </button>
                <button
                  title="Duplicate"
                  onClick={() => action(p, "duplicate")}
                  className="grid size-9 place-items-center text-muted hover:text-ink"
                >
                  <Copy size={15} />
                </button>
                <button
                  title="Regenerate"
                  onClick={() => action(p, "regenerate")}
                  className="grid size-9 place-items-center text-muted hover:text-ink"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  title="Delete"
                  onClick={() => action(p, "delete")}
                  className="ml-auto grid size-9 place-items-center text-muted hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function OneVoice({ session }: { session: Session }) {
  const [memories, setMemories] = useState<Memory[]>([]),
    [suggestions, setSuggestions] = useState<Suggestion[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<{ memories: Memory[]; suggestions: Suggestion[] }>("/api/memories")
        .then((x) => {
          setMemories(x.memories);
          setSuggestions(x.suggestions);
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function add() {
    if (!text.trim()) return;
    try {
      await api("/api/memories", {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setText("");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function edit(m: Memory) {
    const content = prompt("Edit OneVoice memory", m.content);
    if (content?.trim())
      try {
        await api(`/api/memories/${m.id}`, {
          method: "PATCH",
          body: JSON.stringify({ content }),
        });
        load();
      } catch (e) {
        setError((e as Error).message);
      }
  }
  async function remove(m: Memory) {
    if (confirm("Delete this OneVoice memory?"))
      try {
        await api(`/api/memories/${m.id}`, { method: "DELETE" });
        load();
      } catch (e) {
        setError((e as Error).message);
      }
  }
  async function suggestion(id: string, action: "approve" | "dismiss") {
    await api(`/api/suggestions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    load();
  }
  return (
    <div className="mx-auto max-w-5xl p-6 pt-20 lg:p-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand">
            Your persistent writing memory
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">
            OneVoice<span className="text-brand">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Only approved memories shape future generations. You can inspect,
            edit, or remove any of them.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold ${session.oneVoice?.active ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}
        >
          <i className="size-2 rounded-full bg-current" />
          {session.oneVoice?.active
            ? "OneVoice active · Minds synced"
            : session.oneVoice?.configured
              ? "OneVoice active · Minds pending"
              : "Local OneVoice active"}
        </span>
      </div>
      {error && (
        <div className="mt-5">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <section className="mt-9 rounded-3xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="font-semibold">Remember a preference</h2>
        <p className="mt-1 text-sm text-muted">
          Write a reusable direction, not a one-off content edit.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="e.g. Open with a bold, one-sentence hook"
            className="focus-ring min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3"
          />
          <button onClick={add} className={primary}>
            <Plus size={16} /> Remember
          </button>
        </div>
      </section>
      {suggestions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">
            Suggestions waiting for approval
          </h2>
          <div className="mt-3 grid gap-3">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4 sm:flex-row sm:items-center"
              >
                <p className="text-sm">{s.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => suggestion(s.id, "dismiss")}
                    className={secondary}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => suggestion(s.id, "approve")}
                    className={primary}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="mt-8 grid gap-3">
        {memories.map((m) => (
          <article
            key={m.id}
            className="flex items-start gap-4 rounded-2xl border border-line bg-panel p-4"
          >
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
              <WandSparkles size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6">{m.content}</p>
              <p className="mt-1 text-xs capitalize text-muted">
                {m.source} memory {m.remoteId ? "· synced to Minds" : "· local"}
              </p>
            </div>
            <button
              onClick={() => edit(m)}
              title="Edit"
              className="text-muted hover:text-ink"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => remove(m)}
              title="Delete"
              className="text-muted hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))}
        {memories.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line p-12 text-center text-sm text-muted">
            Your approved memories will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPage({
  session,
  setTheme,
  setView,
}: {
  session: Session;
  setTheme: (x: "light" | "dark") => void;
  setView: (v: View) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl p-6 pt-20 lg:p-12">
      <p className="text-sm font-semibold text-brand">Workspace controls</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">
        Settings<span className="text-brand">.</span>
      </h1>
      <div className="mt-9 grid gap-5">
        <section className="rounded-3xl border border-line bg-panel p-6">
          <div className="flex items-center gap-3">
            <UserRound className="text-brand" />
            <div>
              <h2 className="font-semibold">Account</h2>
              <p className="text-sm text-muted">
                {session.user?.name} · {session.user?.email}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-panel p-6">
          <h2 className="font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted">
            Theme changes apply across the full product.
          </p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setTheme("light")} className={secondary}>
              <Sun size={16} /> Light
            </button>
            <button onClick={() => setTheme("dark")} className={secondary}>
              <Moon size={16} /> Dark
            </button>
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-panel p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Free plan</h2>
              <p className="mt-1 text-sm text-muted">
                Explore pricing for more generations and longer recordings.
              </p>
            </div>
            <button onClick={() => setView("pricing")} className={primary}>
              View plans
            </button>
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-panel p-6">
          <h2 className="font-semibold">Integrations</h2>
          <p className="mt-1 text-sm text-muted">
            Social publishing integrations are coming soon. The MVP stays
            focused on copy and export.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            Coming soon
          </span>
        </section>
      </div>
    </div>
  );
}
function Pricing() {
  const plans = [
    [
      "Free",
      "$0",
      ["10 generations / month", "10-minute recordings", "Copy and export"],
    ],
    [
      "Creator",
      "$19",
      ["Unlimited generations", "60-minute recordings", "Full OneVoice memory"],
    ],
    [
      "Studio",
      "$49",
      ["Everything in Creator", "3 team seats", "Priority generation"],
    ],
  ];
  return (
    <div className="mx-auto max-w-6xl p-6 pt-20 lg:p-12">
      <p className="text-center text-sm font-semibold text-brand">
        Simple pricing
      </p>
      <h1 className="mt-2 text-center text-4xl font-semibold tracking-[-.04em]">
        Make every idea go further<span className="text-brand">.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted">
        Plans are presented for product evaluation. Subscription checkout is
        coming soon.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map(([name, price, features], i) => (
          <section
            key={name as string}
            className={`rounded-3xl border bg-panel p-6 ${i === 1 ? "border-brand ring-4 ring-brand/10" : "border-line"}`}
          >
            <p className="font-semibold">{name as string}</p>
            <p className="mt-5 text-4xl font-semibold">
              {price as string}
              <span className="text-sm font-normal text-muted">/mo</span>
            </p>
            <ul className="mt-7 grid gap-3">
              {(features as string[]).map((x) => (
                <li key={x} className="flex gap-2 text-sm">
                  <Check size={16} className="text-brand" />
                  {x}
                </li>
              ))}
            </ul>
            <button
              disabled
              className={`${i === 1 ? primary : secondary} mt-8 w-full`}
            >
              {i === 0 ? "Current plan" : "Coming soon"}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const [session, setSession] = useState<Session | null>(null),
    [view, setView] = useState<View>("studio"),
    [openProject, setOpenProject] = useState<Project | null>(null),
    [menu, setMenu] = useState(false),
    [theme, setThemeState] = useState<"light" | "dark">("dark");
  const reload = useCallback(
    () => api<Session>("/api/session").then(setSession),
    [],
  );
  useEffect(() => {
    const saved =
      (localStorage.getItem("reword-theme") as "light" | "dark") || "dark";
    setThemeState(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
    reload();
  }, [reload]);
  function setTheme(x: "light" | "dark") {
    setThemeState(x);
    localStorage.setItem("reword-theme", x);
    document.documentElement.classList.toggle("dark", x === "dark");
  }
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setSession({ user: null });
  }
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin text-brand" />
      </div>
    );
  if (!session.user) return <Auth reload={reload} />;
  if (!session.user.onboardingComplete)
    return <Onboarding user={session.user} reload={reload} />;
  let content: React.ReactNode;
  if (openProject)
    content = (
      <Editor
        initial={openProject}
        onBack={() => {
          setOpenProject(null);
          setView("projects");
        }}
      />
    );
  else if (view === "studio") content = <Studio onOpen={setOpenProject} />;
  else if (view === "projects" || view === "library")
    content = (
      <ProjectList libraryOnly={view === "library"} onOpen={setOpenProject} />
    );
  else if (view === "onevoice") content = <OneVoice session={session} />;
  else if (view === "pricing") content = <Pricing />;
  else
    content = (
      <SettingsPage session={session} setTheme={setTheme} setView={setView} />
    );
  return (
    <div className="flex min-h-screen bg-surface text-ink">
      <Sidebar
        view={view}
        setView={(v) => {
          setOpenProject(null);
          setView(v);
        }}
        user={session.user}
        onLogout={logout}
        open={menu}
        setOpen={setMenu}
      />
      <main className="min-w-0 flex-1">{content}</main>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle theme"
        className="fixed bottom-4 right-4 z-20 grid size-10 place-items-center rounded-full border border-line bg-panel text-muted shadow-xl hover:text-ink"
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}
