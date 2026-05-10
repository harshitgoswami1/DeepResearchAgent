"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MarkdownReport } from "./components/markdown-report";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const starterPrompts = [
  "Tell me about Claude Mythos",
  "Latest AI browser agents",
  "Compare GPT-4.1, Claude, and Gemini",
  "State of open-source LLMs",
];

type SourceRecord = {
  title?: string;
  url?: string;
  snippet?: string;
};

type FeedbackRecord = {
  score?: number | null;
  out_of?: number | null;
  strengths?: string[];
  areas_to_improve?: string[];
  verdict?: string;
};

type ResearchResponse = {
  topic: string;
  search_results?: Array<string | SourceRecord>;
  scraped_content?: unknown[];
  report: string;
  feedback?: FeedbackRecord | string | null;
};

type UserMessage = {
  id: string;
  role: "user";
  content: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant";
  content: string;
  payload?: ResearchResponse;
  error?: boolean;
};

type Message = UserMessage | AssistantMessage;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function formatFeedback(feedback: unknown) {
  if (!feedback) return null;
  if (typeof feedback === "string") return feedback;
  return JSON.stringify(feedback, null, 2);
}

function normalizeFeedback(feedback: ResearchResponse["feedback"]) {
  if (!feedback) return null;

  if (typeof feedback === "string") {
    const scoreMatch = feedback.match(/Score:\s*(\d+)(?:\s*\/\s*(\d+))?/i);
    const verdictMatch = feedback.match(/One line verdict:\s*([\s\S]+)/i);

    const parseList = (section: string, nextSections: string[]) => {
      const pattern = new RegExp(
        `${section}:\\s*([\\s\\S]*?)(?=\\n(?:${nextSections.join("|")}):|$)`,
        "i",
      );
      const match = feedback.match(pattern);
      if (!match) return [];

      return match[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-"))
        .map((line) => line.replace(/^-+\s*/, "").trim());
    };

    return {
      score: scoreMatch ? Number(scoreMatch[1]) : null,
      out_of: scoreMatch?.[2] ? Number(scoreMatch[2]) : 10,
      strengths: parseList("Strengths", ["Areas to Improve", "One line verdict"]),
      areas_to_improve: parseList("Areas to Improve", ["One line verdict"]),
      verdict: verdictMatch?.[1]?.trim() || feedback.trim(),
    };
  }

  return {
    score: feedback.score ?? null,
    out_of: feedback.out_of ?? 10,
    strengths: Array.isArray(feedback.strengths) ? feedback.strengths : [],
    areas_to_improve: Array.isArray(feedback.areas_to_improve)
      ? feedback.areas_to_improve
      : [],
    verdict: feedback.verdict?.trim() || "",
  };
}

function getSourceMeta(source: string | SourceRecord, index: number) {
  if (typeof source === "string") {
    return {
      title: `Source ${index + 1}`,
      description: source,
      href: undefined,
    };
  }
  return {
    title: source.title?.trim() || `Source ${index + 1}`,
    description:
      source.snippet?.trim() || source.url?.trim() || "No preview available.",
    href: source.url?.trim(),
  };
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/* ─── User turn ─────────────────────────────────── */
function UserTurn({ content, index }: { content: string; index: number }) {
  return (
    <div
      className="rise group"
      data-testid={`user-turn-${index}`}
      style={{ animationDelay: "20ms" }}
    >
      <div className="flex items-baseline gap-3">
        <span className="kicker">You · {pad2(index)}</span>
        <div className="hairline flex-1 opacity-50" />
      </div>
      <p
        className="font-serif mt-3 text-[22px] leading-[1.35] tracking-[-0.01em] text-white sm:text-[26px]"
        // style={{ fontStyle: "italic", fontWeight: 400 }}
      >
        {content}
      </p>
    </div>
  );
}

/* ─── Loading state ─────────────────────────────── */
function LoadingTurn({ topic, index }: { topic: string; index: number }) {
  return (
    <div className="rise" data-testid="loading-turn">
      <div className="flex items-baseline gap-3">
        <span className="kicker" style={{ color: "var(--accent)" }}>
          Brief · {pad2(index)} · drafting
        </span>
        <div className="hairline flex-1 opacity-50" />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-5 w-5 shrink-0">
          <div
            className="absolute inset-0 rounded-full border-[1.5px] border-transparent spin-slow"
            style={{ borderTopColor: "var(--accent)" }}
          />
          <div
            className="absolute inset-1.5 rounded-full pulse-dot"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 14px var(--accent-glow)",
            }}
          />
        </div>
        <p className="shimmer-text font-mono text-[12px] tracking-[0.12em] uppercase">
          Searching · scraping · synthesising — {topic}
        </p>
      </div>

      <div className="mt-6 space-y-2.5">
        {[92, 78, 88, 64].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-sm fade-in"
            style={{
              width: `${w}%`,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Assistant turn ────────────────────────────── */
function AssistantTurn({
  content,
  payload,
  error = false,
  index,
}: {
  content: string;
  payload?: ResearchResponse;
  error?: boolean;
  index: number;
}) {
  const sources = payload?.search_results ?? [];
  const feedback = normalizeFeedback(payload?.feedback);
  const scrapedCount = Array.isArray(payload?.scraped_content)
    ? payload.scraped_content.length
    : 0;

  return (
    <article
      className="rise"
      data-testid={`assistant-turn-${index}`}
      style={{ animationDelay: "60ms" }}
    >
      <div className="flex items-baseline gap-3">
        <span
          className="kicker"
          style={{ color: error ? "#fca5a5" : "var(--accent)" }}
        >
          {error ? "Error" : "Brief"} · {pad2(index)}
          {payload?.topic ? ` · ${payload.topic}` : ""}
        </span>
        <div className="hairline flex-1 opacity-50" />
      </div>

      {/* Body — editorial column */}
      <div className="mt-5">
        <MarkdownReport content={content} error={error} />
      </div>

      {!error && payload ? (
        <>
          {/* Stats — editorial split row */}
          <div className="mt-9 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)]">
            <Stat label="Sources" value={String(sources.length)} />
            <Stat label="Pages scraped" value={String(scrapedCount)} />
            <Stat
              label="Feedback"
              value={
                feedback?.score != null
                  ? `${feedback.score}/${feedback.out_of ?? 10}`
                  : feedback
                    ? "Available"
                    : "—"
              }
              accent={Boolean(feedback)}
            />
          </div>

          {/* Sources — editorial numbered list */}
          {sources.length > 0 ? (
            <details
              className="group mt-7 border-t border-[var(--line)] pt-5"
              data-testid="sources-details"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors group-hover:text-white">
                  ↳ View all {sources.length} sources
                </span>
                <span
                  className="font-mono text-[11px] text-[var(--text-faint)] transition-transform duration-300 group-open:rotate-180"
                  aria-hidden
                >
                  ⌃
                </span>
              </summary>
              <ol className="mt-5 space-y-4">
                {sources.map((source, i) => {
                  const item = getSourceMeta(source, i);
                  return (
                    <li
                      key={`${item.title}-${i}`}
                      className="grid grid-cols-[36px_1fr] gap-4"
                    >
                      <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-quiet)] pt-[3px]">
                        {pad2(i + 1)}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="text-[15px] font-medium text-white">
                            {item.title}
                          </p>
                          {item.href ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`source-link-${i}`}
                              className="group/link font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)] transition-colors hover:text-white"
                            >
                              Open
                              <span className="ml-1 inline-block transition-transform group-hover/link:translate-x-0.5">
                                →
                              </span>
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[14px] leading-[1.65] text-[var(--text-muted)]">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          ) : null}

          {/* Feedback */}
          {feedback ? (
            <details
              className="group mt-5 border-t border-[var(--line)] pt-5"
              data-testid="feedback-details"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors group-hover:text-white">
                  ↳ Research critique
                </span>
                <div className="flex items-center gap-3">
                  {feedback.score != null ? (
                    <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-[var(--accent)]">
                      Score {feedback.score}/{feedback.out_of ?? 10}
                    </span>
                  ) : null}
                  <span
                    className="font-mono text-[11px] text-[var(--text-faint)] transition-transform duration-300 group-open:rotate-180"
                    aria-hidden
                  >
                    ⌃
                  </span>
                </div>
              </summary>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="kicker">Strengths</p>
                  {feedback.strengths && feedback.strengths.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-[14px] leading-[1.65] text-[var(--text-muted)]">
                      {feedback.strengths.map((item, i) => (
                        <li key={`${i}-${item.slice(0, 20)}`} className="flex gap-3">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[14px] text-[var(--text-faint)]">
                      No strengths provided.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="kicker">Areas To Improve</p>
                  {feedback.areas_to_improve && feedback.areas_to_improve.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-[14px] leading-[1.65] text-[var(--text-muted)]">
                      {feedback.areas_to_improve.map((item, i) => (
                        <li key={`${i}-${item.slice(0, 20)}`} className="flex gap-3">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[14px] text-[var(--text-faint)]">
                      No improvement notes provided.
                    </p>
                  )}
                </div>
              </div>

              {feedback.verdict ? (
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4">
                  <p className="kicker">Verdict</p>
                  <p className="mt-3 text-[15px] leading-[1.7] text-white">
                    {feedback.verdict}
                  </p>
                </div>
              ) : null}
            </details>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[var(--bg)] px-4 py-4">
      <p className="kicker">{label}</p>
      <p
        className={`mt-2 font-serif text-[26px] leading-none tracking-[-0.02em] sm:text-[30px] ${
          accent ? "" : "text-white"
        }`}
        style={accent ? { color: "var(--accent)" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  /* auto-grow textarea */
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [topic]);

  /* scroll to bottom on new message */
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSubmitting]);

  async function submitResearch(nextTopic: string) {
    const trimmedTopic = nextTopic.trim();
    if (!trimmedTopic || isSubmitting) return;

    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", content: trimmedTopic },
    ]);
    setTopic("");
    setActiveTopic(trimmedTopic);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmedTopic }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = (await response.json()) as ResearchResponse;

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: result.report || "No report was returned by the backend.",
          payload: result,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The request could not be completed.";

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "The frontend could not fetch a research response. Make sure the FastAPI server is running and that NEXT_PUBLIC_API_URL points to it.\n\n" +
            message,
          error: true,
        },
      ]);
    } finally {
      setIsSubmitting(false);
      setActiveTopic("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitResearch(topic);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitResearch(topic);
    }
  }

  const hasMessages = messages.length > 0;
  let turnIndex = 0; // global index for editorial numbering

  return (
  <main
        className="relative z-10 min-h-screen text-[var(--text)]"
        data-testid="home-main"
      >
        <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-5 pb-56 pt-5  sm:px-8 sm:pb-64 lg:px-12 ">
          <header
            className="flex items-center justify-between"
            data-testid="site-header"
          >
            <a
              href="#"
              className="group flex items-center "
              data-testid="brand"
            >

              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-white">
                Deep

                Research
              </span>
            </a>

            <div
              className="flex items-center font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]"
              data-testid="status-indicator"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full pulse-dot"
                style={{ background: "var(--accent)" }}
              />
              <span className="hidden sm:inline">Backend online</span>
              <span className="sm:hidden">Online</span>
            </div>
          </header>

          {/* ─── Body ───────────────────────────────── */}
          <section className="flex flex-1 flex-col">
            {!hasMessages ? (
              /* Empty / hero state */
              <div
                className="mx-auto flex w-full flex-1 flex-col justify-center "
                data-testid="empty-state"
                style={{ transform: "scale(0.75)" }}
              >
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                  <div className="lg:col-span-9">
                    <p
                      className="kicker fade-in"
                      style={{ color: "var(--accent)" }}
                    >
                      ✦ Issue №01 — Editorial Research
                    </p>

                    <h1
                      className="rise mt-6 font-serif text-[44px] leading-[1.02] tracking-[-0.035em] text-white sm:text-[64px] lg:text-[88px]"
                      style={{ fontWeight: 350 }}
                    >
                      A quiet place to{" "}
                      <span
                        className="italic"
                        style={{
                          color: "var(--accent)",
                          fontWeight: 300,
                        }}
                      >
                        think
                      </span>
                      ,
                      <br className="hidden sm:block" />
                      delegated to a research engine.
                    </h1>

                    <p
                      className="rise mt-7 max-w-[58ch] text-[16px] leading-[1.75] text-[var(--text-muted)] sm:text-[18px] sm:leading-[1.78]"
                      style={{ animationDelay: "120ms" }}
                    >
                      Type a topic. The pipeline searches the open web, scrapes
                      the most relevant pages, and returns a written brief —
                      citations included. No accounts. No ceremony.
                    </p>

                    <div
                      className="rise mt-10 flex flex-wrap items-center gap-2"
                      style={{ animationDelay: "200ms" }}
                      data-testid="starter-prompts"
                    >
                      <span className="kicker mr-1">Try</span>
                      {starterPrompts.map((prompt, i) => (
                        <button
                          key={prompt}
                          type="button"
                          data-testid={`starter-prompt-${i}`}
                          onClick={() => {
                            setTopic(prompt);
                            composerRef.current?.focus();
                          }}
                          className="group/chip relative rounded-full border border-[var(--line)] bg-transparent px-4 py-1.5 text-[13px] text-[var(--text-muted)] transition-all duration-200 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-white"
                        >
                          {prompt}
                          <span className="ml-2 inline-block opacity-0 transition-all duration-200 group-hover/chip:translate-x-0.5 group-hover/chip:opacity-100">
                            →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* meta column */}
                  <aside
                    className="rise lg:col-span-3 lg:border-l lg:border-[var(--line)] lg:pl-7"
                    style={{ animationDelay: "260ms" }}
                    data-testid="hero-meta"
                  >
                    <dl className="space-y-7">
                      <div>
                        <dt className="kicker">Pipeline</dt>
                        <dd className="mt-2 font-serif text-[20px] italic text-white">
                          search → scrape → synthesise
                        </dd>
                      </div>
                      <div>
                        <dt className="kicker">Output</dt>
                        <dd className="mt-2 text-[14px] leading-[1.7] text-[var(--text-muted)]">
                          A written brief with verifiable sources.
                        </dd>
                      </div>
                      <div>
                        <dt className="kicker">Time</dt>
                        <dd className="mt-2 text-[14px] text-[var(--text-muted)]">
                          ≈ 30–60 seconds
                        </dd>
                      </div>
                    </dl>
                  </aside>
                </div>
              </div>
            ) : (
              /* Conversation thread */
              <div
                className="mx-auto w-full max-w-[760px] flex-1 pt-12 sm:pt-16"
                data-testid="thread"
              >
                <div className="space-y-14">
                  {messages.map((message) => {
                    turnIndex += 1;
                    return message.role === "user" ? (
                      <UserTurn
                        key={message.id}
                        content={message.content}
                        index={turnIndex}
                      />
                    ) : (
                      <AssistantTurn
                        key={message.id}
                        content={message.content}
                        payload={message.payload}
                        error={message.error}
                        index={turnIndex}
                      />
                    );
                  })}
                  {isSubmitting ? (
                    <LoadingTurn
                      topic={activeTopic}
                      index={turnIndex + 1}
                    />
                  ) : null}
                </div>
                <div ref={threadEndRef} />
              </div>
            )}
          </section>
        </div>

        {/* ─── Composer ─────────────────────────────── */}
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-5 pt-20 sm:px-6 sm:pb-7"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,8,10,0) 0%, rgba(6,8,10,0.72) 28%, rgba(6,8,10,0.96) 70%, rgba(6,8,10,1) 100%)",
          }}
          data-testid="composer-wrapper"
        >
          <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
            <form
              onSubmit={handleSubmit}
              data-testid="composer-form"
              className="group/form relative rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)]/90 px-4 pb-3 pt-3.5 shadow-[0_30px_120px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-colors focus-within:border-[var(--accent-deep)]"
            >
              {/* subtle cyan focus glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-focus-within/form:opacity-100"
                style={{
                  boxShadow: "0 0 0 1px var(--accent-soft), 0 0 60px -10px var(--accent-glow) inset",
                }}
                aria-hidden
              />

              <div className="flex items-start gap-3">
                <span
                  className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]"
                  aria-hidden
                >
                  ›
                </span>
                <label htmlFor="topic" className="sr-only">
                  Research topic
                </label>
                <textarea
                  ref={composerRef}
                  id="topic"
                  data-testid="composer-input"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  placeholder="What do you want to research?"
                  className="min-h-[28px] w-full resize-none border-none bg-transparent py-1 text-[16px] leading-[1.6] text-white outline-none placeholder:text-[var(--text-faint)] sm:text-[17px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-soft)] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em]"
                    style={{
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                    }}
                  >
                    <span
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                    Deep mode
                  </span>
                  <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-faint)] sm:inline">
                    Citations included
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--text-faint)] sm:inline">
                    ↵ Enter to send
                  </span>
                  <button
                    type="submit"
                    data-testid="composer-submit"
                    disabled={isSubmitting || !topic.trim()}
                    className="group/btn relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full px-5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-200 disabled:cursor-not-allowed"
                    style={{
                      background: isSubmitting || !topic.trim() ? "rgba(255,255,255,0.04)" : "var(--accent)",
                      color: isSubmitting || !topic.trim() ? "var(--text-faint)" : "#031416",
                      boxShadow: isSubmitting || !topic.trim() ? "none" : "0 8px 30px -8px var(--accent-glow)",
                    }}
                  >
                    <span>{isSubmitting ? "Researching" : "Research"}</span>
                    <span
                      className={`inline-block transition-transform duration-300 ${
                        isSubmitting ? "" : "group-hover/btn:translate-x-1"
                      }`}
                      aria-hidden
                    >
                      {isSubmitting ? (
                        <span className="caret" aria-hidden />
                      ) : (
                        "→"
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </form>

            <p className="mt-3.5 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-quiet)]">
              Outputs may contain mistakes — verify important details.
            </p>
          </div>
        </div>
      </main>
  );
}
