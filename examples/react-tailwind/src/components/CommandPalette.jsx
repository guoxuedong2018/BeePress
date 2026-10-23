import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog, EmptyState } from "builderharness/ui";

import { COMMANDS } from "../data";
import { Icon } from "./Icons";

/** UI: surface-2 / shadow-popover / t-body / radius-2xl / caption */
export function CommandPalette({ open, onOpenChange, onRun }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => `${c.label} ${c.section}`.toLowerCase().includes(q)) : COMMANDS;
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(items.length - 1, 0)));
  }, [items.length]);

  const run = (item) => {
    if (!item) return;
    onOpenChange(false);
    onRun(item.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Jump to a page, run an experiment or change the theme." footer={false}>
      <div className="-mt-2">
        <label htmlFor="command-search" className="sr-only">
          Search commands
        </label>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-default bg-surface-3 px-2.5">
          <Icon name="search" size={15} className="text-tertiary" />
          <input
            ref={inputRef}
            id="command-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // EDGE-01: never intercept Enter while an IME candidate is composing.
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (i + 1) % Math.max(items.length, 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(items[active]);
              }
            }}
            placeholder="Type a command or search…"
            className="min-w-0 flex-1 bg-transparent text-body text-primary outline-none placeholder:text-tertiary focus-visible:shadow-focus"
            autoComplete="off"
          />
          <kbd className="rounded-sm border border-subtle bg-surface-2 px-1.5 text-caption text-tertiary">Esc</kbd>
        </div>

        {items.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<Icon name="search" size={24} />}
              title="No matching command"
              description="Try “experiment”, “review”, “theme” or clear the search."
              action={
                <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-2 max-h-[320px] overflow-y-auto demo-scroll" role="listbox" aria-label="Commands">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body transition-colors duration-fast ease-out ${
                  i === active ? "bg-surface-hover text-primary" : "text-secondary"
                }`}
              >
                <span className="flex size-6 items-center justify-center rounded-md bg-surface-active text-tertiary">
                  <Icon name={item.id === "new" ? "plus" : item.id === "theme" ? "moon" : "arrow"} size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="tnum text-caption text-tertiary">{item.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
