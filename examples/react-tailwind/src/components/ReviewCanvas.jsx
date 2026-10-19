import { useState } from "react";
import { Badge, Button, SegmentedControl } from "builder-kit/ui";

import { THREADS } from "../data";
import { Icon } from "./Icons";

const TABS = [
  { value: "preview", label: "Preview" },
  { value: "comments", label: "Comments" },
  { value: "structure", label: "Structure" },
];

const PINS = [
  { id: "t1", number: 1, x: "72%", y: "34%" },
  { id: "t2", number: 2, x: "24%", y: "62%" },
  { id: "t3", number: 3, x: "58%", y: "78%" },
];

function ThreadRow({ thread, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      className={`flex w-full gap-3 border-b border-subtle px-4 py-3 text-left transition-colors duration-fast ease-out last:border-b-0 ${
        active ? "bg-surface-hover" : "hover:bg-surface-hover"
      }`}
    >
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill text-caption font-semibold ${
          thread.resolved ? "bg-success-subtle text-success" : "bg-accent-subtle text-accent"
        }`}
        aria-hidden="true"
      >
        {thread.resolved ? "✓" : thread.number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-footnote font-medium text-primary">{thread.author}</span>
          <span className="tnum text-caption text-tertiary">{thread.time} ago</span>
          {thread.resolved && <Badge tone="success">Resolved</Badge>}
        </span>
        <span className="mt-1 block text-footnote text-secondary wrap-pretty">{thread.body}</span>
      </span>
      <Icon name="chevron" size={14} className="mt-1 text-tertiary" />
    </button>
  );
}

/** UI: surface-2 / shadow-sm / radius-panel / accent-subtle / caption / tnum */
export function ReviewCanvas() {
  const [tab, setTab] = useState("preview");
  const [active, setActive] = useState("t1");

  return (
    <section className="min-w-0 overflow-hidden rounded-panel bg-surface-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-subtle px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-heading font-semibold text-primary wrap-balance">Live review surface</h2>
          <p className="mt-0.5 text-caption text-tertiary">Every pin is anchored to source · confidence is explicit</p>
        </div>
        <div className="ml-auto w-full min-w-0 shrink-0 sm:w-auto">
          <SegmentedControl className="w-fit max-w-full [container-type:normal]" items={TABS} value={tab} onValueChange={setTab} aria-label="Review surface view" />
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <div className="relative min-w-0 p-4">
          <div className="overflow-hidden rounded-lg border border-subtle bg-surface-1">
            <div className="flex h-9 items-center gap-1.5 border-b border-subtle bg-surface-2 px-3">
              <span className="size-2 rounded-pill bg-danger" aria-hidden="true" />
              <span className="size-2 rounded-pill bg-warning" aria-hidden="true" />
              <span className="size-2 rounded-pill bg-success" aria-hidden="true" />
              <span className="ml-2 min-w-0 truncate rounded-sm bg-surface-3 px-2 py-0.5 text-caption text-tertiary">
                helix.local/experiments/042
              </span>
              <Icon name="refresh" size={13} className="ml-auto text-tertiary" />
            </div>

            <div className="demo-grid relative min-h-[300px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-caption text-tertiary">Experiment 042</p>
                  <h3 className="text-body-lg font-semibold text-primary">Retrieval quality · hybrid rerank</h3>
                </div>
                <Badge tone="info">Running</Badge>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-subtle bg-surface-2">
                <div className="grid grid-cols-[1fr_88px_72px] gap-3 border-b border-subtle bg-surface-3 px-3 py-2 text-caption font-semibold text-secondary">
                  <span>Slice</span>
                  <span className="text-right">Score</span>
                  <span className="text-right">Δ</span>
                </div>
                {[
                  ["Long queries", "96.4", "+1.8"],
                  ["Multi-hop", "94.1", "+2.7"],
                  ["Freshness", "91.8", "-0.4"],
                  ["Noisy input", "89.2", "+0.9"],
                ].map(([slice, score, delta]) => (
                  <div key={slice} className="grid grid-cols-[1fr_88px_72px] gap-3 border-b border-subtle px-3 py-2 text-footnote last:border-b-0">
                    <span className="truncate text-primary">{slice}</span>
                    <span className="tnum text-right font-mono text-primary">{score}</span>
                    <span className={`tnum text-right ${delta.startsWith("-") ? "text-danger" : "text-success"}`}>{delta}</span>
                  </div>
                ))}
              </div>

              {PINS.map((pin) => (
                <button
                  key={pin.id}
                  type="button"
                  aria-label={`Open review thread ${pin.number}`}
                  onClick={() => {
                    setActive(pin.id);
                    setTab("comments");
                  }}
                  style={{ left: pin.x, top: pin.y }}
                  className={`absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-surface-2 text-caption font-semibold shadow-md transition-transform duration-fast ease-out hover:scale-110 ${
                    active === pin.id ? "bg-accent text-on-accent" : "bg-surface-2 text-accent"
                  }`}
                >
                  {pin.number}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="success" icon="✓">
              12 exact anchors
            </Badge>
            <Badge tone="warning" icon="≈">
              2 moved
            </Badge>
            <Badge tone="neutral" icon="•">
              1 lost
            </Badge>
            <Button variant="ghost" size="sm" className="ml-auto">
              <Icon name="external" size={14} />
              Open in prototype
            </Button>
          </div>
        </div>

        <div className="min-w-0 border-t border-subtle xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-footnote font-medium text-primary">Review threads</span>
            <Badge tone="neutral">{THREADS.filter((t) => !t.resolved).length} open</Badge>
          </div>
          <div className="max-h-[356px] overflow-y-auto demo-scroll">
            {THREADS.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} active={active === thread.id} onSelect={setActive} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
