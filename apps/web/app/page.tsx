"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const starterPrompts = [
  "Tell me about Claude Mythos",
  "Summarize the latest AI browser agents",
  "Compare GPT-4.1, Claude, and Gemini for research",
];

type SourceRecord = {
  title?: string;
  url?: string;
  snippet?: string;
};

type ResearchResponse = {
  topic: string;
  search_results?: Array<string | SourceRecord>;
  scraped_content?: unknown[];
  report: string;
  feedback?: unknown;
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
  return crypto.randomUUID();
}

function formatFeedback(feedback: unknown) {
  if (!feedback) {
    return null;
  }

  if (typeof feedback === "string") {
    return feedback;
  }

  return JSON.stringify(feedback, null, 2);
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
    description: source.snippet?.trim() || source.url?.trim() || "No preview available.",
    href: source.url?.trim(),
  };
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[28px] border border-white/10 bg-white/[0.08] px-5 py-3 text-[15px] text-white shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:max-w-[65%]">
        {content}
      </div>
    </div>
  );
}

function LoadingCard({ topic }: { topic: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[28px] border border-white/8 bg-white/[0.04] px-5 py-4 text-sm text-white/82 shadow-[0_16px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-sky-400/50 border-t-transparent animate-spin" />
        <div className="h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_20px_rgba(125,211,252,0.8)]" />
      </div>
      <div>
        <p className="font-medium text-white">Generating research brief</p>
        <p className="mt-1 text-white/52">{topic}</p>
      </div>
    </div>
  );
}

function AssistantCard({
  content,
  payload,
  error = false,
}: {
  content: string;
  payload?: ResearchResponse;
  error?: boolean;
}) {
  const sources = payload?.search_results ?? [];
  const feedback = formatFeedback(payload?.feedback);
  const scrapedCount = Array.isArray(payload?.scraped_content)
    ? payload.scraped_content.length
    : 0;

  return (
    <article className="rounded-[32px] border border-white/8 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-7">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
          <div className="h-3 w-3 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.85)]" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-white/38">
            {error ? "Request error" : "Research response"}
          </p>
          <h2 className="mt-1 text-lg font-medium text-white">
            {payload?.topic || "Assistant"}
          </h2>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-[15px] leading-7 text-white/76">
        {content.split(/\n{2,}/).map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 12)}-${index}`} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>

      {!error && payload ? (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Sources
              </p>
              <p className="mt-2 text-2xl text-white">{sources.length}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Scraped pages
              </p>
              <p className="mt-2 text-2xl text-white">{scrapedCount}</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Feedback
              </p>
              <p className="mt-2 text-base text-white/76">
                {feedback ? "Available" : "None"}
              </p>
            </div>
          </div>

          {sources.length > 0 ? (
            <details className="mt-5 rounded-3xl border border-white/8 bg-black/20 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-white">
                View sources
              </summary>
              <div className="mt-4 space-y-3">
                {sources.map((source, index) => {
                  const item = getSourceMeta(source, index);

                  return (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-white/56">
                            {item.description}
                          </p>
                        </div>
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-sky-300 transition hover:text-sky-200"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}

          {feedback ? (
            <details className="mt-4 rounded-3xl border border-white/8 bg-black/20 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-white">
                View backend feedback
              </summary>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-white/56">
                {feedback}
              </pre>
            </details>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitResearch(nextTopic: string) {
    const trimmedTopic = nextTopic.trim();

    if (!trimmedTopic || isSubmitting) {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.12),_transparent_30%),radial-gradient(circle_at_20%_80%,_rgba(56,189,248,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_24%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-36 pt-6 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
              <div className="h-5 w-5 rounded-full bg-[conic-gradient(from_220deg,_#f59e0b,_#fb7185,_#60a5fa,_#f59e0b)]" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/30">
                Deep Research
              </p>
              <p className="text-sm text-white/55">web + api turborepo shell</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.12)] sm:block">
            Backend ready
          </div>
        </header>

        <section className="flex flex-1 flex-col">
          {hasMessages ? (
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 pb-8 pt-12">
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserBubble key={message.id} content={message.content} />
                ) : (
                  <AssistantCard
                    key={message.id}
                    content={message.content}
                    payload={message.payload}
                    error={message.error}
                  />
                ),
              )}
              {isSubmitting ? <LoadingCard topic={activeTopic} /> : null}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center pb-10 pt-12">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.28em] text-white/32">
                  Minimal research chat
                </p>
                <h1 className="mt-5 text-4xl font-medium tracking-[-0.04em] text-white sm:text-6xl">
                  Ask the backend for a deep research brief.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/56 sm:text-lg">
                  The API is already complete. This frontend keeps the surface
                  tight: enter a topic, trigger `/research`, and read the report
                  with sources in a focused response card.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setTopic(prompt)}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/68 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(10,11,15,0)_0%,rgba(10,11,15,0.72)_32%,rgba(10,11,15,0.98)_100%)] px-4 pb-6 pt-16 sm:px-6">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl">
          <form
            onSubmit={handleSubmit}
            className="rounded-[34px] border border-white/10 bg-[#17181d]/90 p-4 shadow-[0_24px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-5"
          >
            <label htmlFor="topic" className="sr-only">
              Research topic
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="What do you want to research?"
              className="min-h-[88px] w-full resize-none border-none bg-transparent px-2 py-1 text-lg leading-8 text-white outline-none placeholder:text-white/40"
            />

            <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-sky-300/18 bg-sky-300/10 px-3 py-1 text-sm text-sky-200">
                  Deep Research
                </span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-sm text-white/52">
                  Sources included
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="hidden text-sm text-white/38 sm:inline">
                  Enter to send
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !topic.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/14 disabled:text-white/35"
                >
                  {isSubmitting ? "Researching..." : "Research"}
                </button>
              </div>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-white/34">
            Research outputs may contain mistakes. Verify important details.
          </p>
        </div>
      </div>
    </main>
  );
}
