"use client";

import { useEffect, useState } from "react";

export type PipelineStage = {
  key: string;
  title: string;
  description: string;
  summary?: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
};

export type PipelineRun = {
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
  stages: PipelineStage[];
};

const STAGE_BLUEPRINT = [
  {
    key: "search",
    title: "Search the web",
    description: "Collect relevant sources and snippets.",
  },
  {
    key: "scrape",
    title: "Read and scrape",
    description: "Pick the strongest page and extract details.",
  },
  {
    key: "write",
    title: "Draft report",
    description: "Turn the gathered context into a clean brief.",
  },
  {
    key: "critique",
    title: "Review output",
    description: "Score the draft and note strengths or gaps.",
  },
] as const;

function formatDuration(durationMs?: number | null) {
  if (durationMs == null) {
    return "—";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = durationMs / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
}

function formatClock(timestamp?: string) {
  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp);

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function PipelineRow({
  index,
  title,
  description,
  meta,
  status,
  isLast = false,
}: {
  index: number;
  title: string;
  description: string;
  meta?: {
    summary?: string;
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
  };
  status: "done" | "active" | "queued";
  isLast?: boolean;
}) {
  const statusStyles = {
    done: {
      text: "text-white",
      chipText: "text-[var(--accent)]",
      dot: "bg-[var(--accent)]",
      line: "bg-[var(--line-strong)]",
    },
    active: {
      text: "text-white",
      chipText: "text-[var(--accent)]",
      dot: "bg-[var(--accent)] pulse-dot",
      line: "bg-[var(--accent-soft)]",
    },
    queued: {
      text: "text-[var(--text-muted)]",
      chipText: "text-[var(--text-faint)]",
      dot: "bg-white/20",
      line: "bg-[var(--line)]",
    },
  }[status];

  const label =
    status === "done" ? "done" : status === "active" ? "running" : "queued";

  return (
    <li className="relative pl-6">
      {index > 0 ? (
        <span
          className={`absolute left-[4px] top-0 h-px w-3 ${statusStyles.line}`}
          aria-hidden
        />
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="relative pt-1">
            {!isLast ? (
              <span
                className="absolute left-[4px] top-3 h-[calc(100%+1rem)] w-px bg-[var(--line)]"
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-10 inline-block h-2.5 w-2.5 rounded-full ${statusStyles.dot}`}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className={`text-[14px] font-medium ${statusStyles.text}`}>
                {title}
              </h4>
              <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${statusStyles.chipText}`}>
                {label}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-[1.65] text-[var(--text-muted)]">
              {meta?.summary || description}
            </p>
          </div>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            {formatDuration(meta?.duration_ms)}
          </p>
          {meta?.started_at ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-quiet)]">
              {formatClock(meta.started_at)}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function PipelineTimeline({ pipeline }: { pipeline: PipelineRun }) {
  return (
    <section
      className="w-full max-w-[420px] border-t border-[var(--line)] pt-4"
      data-testid="pipeline-timeline"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-faint)]">
          Backend pipeline
        </p>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-quiet)]">
          <span>{formatClock(pipeline.started_at)} → {formatClock(pipeline.completed_at)}</span>
          <span className="text-[var(--accent)]">{formatDuration(pipeline.total_duration_ms)}</span>
        </div>
      </div>

      <ol className="mt-3 space-y-3">
        {pipeline.stages.map((stage, index) => (
          <PipelineRow
            key={stage.key}
            index={index}
            title={stage.title}
            description={stage.description}
            meta={stage}
            status="done"
            isLast={index === pipeline.stages.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

export function PipelineLiveTimeline({
  requestStartedAt,
}: {
  requestStartedAt: number;
}) {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - requestStartedAt);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - requestStartedAt);
    }, 250);

    return () => window.clearInterval(interval);
  }, [requestStartedAt]);

  const activeIndex = Math.min(
    Math.floor(elapsedMs / 4500),
    STAGE_BLUEPRINT.length - 1,
  );

  return (
    <section
      className="mt-5 w-full max-w-[420px] border-t border-[var(--line)] pt-4"
      data-testid="pipeline-live-timeline"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
          style={{ color: "var(--accent)" }}
        >
          Backend pipeline running
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
          {formatDuration(elapsedMs)}
        </p>
      </div>

      <ol className="mt-3 space-y-3">
        {STAGE_BLUEPRINT.map((stage, index) => {
          const status =
            index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "queued";

          return (
            <PipelineRow
              key={stage.key}
              index={index}
              title={stage.title}
              description={stage.description}
              status={status}
              isLast={index === STAGE_BLUEPRINT.length - 1}
            />
          );
        })}
      </ol>
    </section>
  );
}
