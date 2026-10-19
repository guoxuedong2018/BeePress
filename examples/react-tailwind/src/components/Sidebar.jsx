import { Badge, Button } from "builder-kit/ui";

import { ROUTES, navigate } from "../router";
import { Icon } from "./Icons";

const NAV = [
  { key: ROUTES.overview, label: "Overview", icon: "layout" },
  { key: ROUTES.experiments, label: "Experiments", icon: "layers", count: "5" },
  { key: ROUTES.reviews, label: "Review queue", icon: "comment", count: "3" },
];

/** UI: surface-0 / border-subtle / caption / accent-subtle */
export function Sidebar({ path }) {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-subtle bg-surface-0 lg:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-on-accent">
          <Icon name="spark" size={18} />
        </span>
        <span className="text-heading font-semibold tracking-tight text-primary">Helix</span>
        <Badge tone="neutral" className="ml-auto">
          beta
        </Badge>
      </div>

      <div className="px-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-panel px-3 py-2 text-left transition-colors duration-fast ease-out hover:bg-surface-hover"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-surface-3 text-secondary">
            <Icon name="git" size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-footnote font-medium text-primary">Atlas research</span>
            <span className="block truncate text-caption text-tertiary">Production workspace</span>
          </span>
          <Icon name="chevron" size={14} className="text-tertiary" />
        </button>
      </div>

      <nav aria-label="Primary" className="mt-4 flex flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = path === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(item.key)}
              className={
                active
                  ? "flex h-9 items-center gap-2.5 rounded-lg bg-surface-2 px-3 text-body font-medium text-primary shadow-sm"
                  : "flex h-9 items-center gap-2.5 rounded-lg px-3 text-body text-secondary transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-primary"
              }
            >
              <Icon name={item.icon} size={16} className={active ? "text-accent" : "text-tertiary"} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count && (
                <span className="tnum rounded-pill bg-surface-active px-1.5 text-caption text-secondary">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 px-3">
        <p className="px-3 pb-1.5 text-caption font-medium uppercase tracking-wide text-tertiary">Pinned</p>
        {["Golden set · v4", "Citation eval", "Latency budget"].map((name) => (
          <button
            key={name}
            type="button"
            className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-footnote text-secondary transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-primary"
          >
            <span className="size-1.5 rounded-pill bg-accent" aria-hidden="true" />
            <span className="truncate">{name}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto p-3">
        <div className="rounded-panel border border-subtle bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-pill bg-success" aria-hidden="true" />
            <span className="text-footnote font-medium text-primary">Pipeline healthy</span>
          </div>
          <p className="mt-1 text-caption text-tertiary">7 screenshots refreshed 26 min ago</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start px-0" onClick={() => navigate(ROUTES.reviews)}>
            Open review queue
            <Icon name="arrow" size={14} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
