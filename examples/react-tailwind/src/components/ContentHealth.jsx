import { Badge, Button, Card } from "beepress/ui";

import { Icon } from "./Icons";

const HEALTH = [
  { label: "Anchors resolved exactly", value: 92, count: "46 / 50", tone: "success" },
  { label: "Screenshots up to date", value: 86, count: "37 / 43", tone: "success" },
  { label: "Facts reviewed in lock", value: 64, count: "16 / 25", tone: "warning" },
];

function Bar({ value, tone }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-pill bg-surface-active" role="presentation">
      <div className={`h-full rounded-pill ${tone === "warning" ? "bg-warning" : "bg-success"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

/** UI: surface-2 / radius-panel / shadow-sm / caption / tnum / success-subtle */
export function ContentHealth() {
  return (
    <Card static className="flex flex-col self-start">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-heading font-semibold text-primary wrap-balance">Content health</h2>
          <p className="mt-0.5 text-caption text-tertiary">Docs that still match the prototype</p>
        </div>
        <Badge tone="success" icon="✓">
          Live
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {HEALTH.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-2 text-footnote">
              <span className="text-secondary">{item.label}</span>
              <span className="tnum text-caption text-tertiary">{item.count}</span>
            </div>
            <div className="mt-1.5">
              <Bar value={item.value} tone={item.tone} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-subtle pt-3">
        <div className="flex items-center gap-2 text-footnote text-secondary">
          <Icon name="alert" size={15} className="text-warning" />
          <span>9 facts need a human confirmation</span>
        </div>
        <Button variant="ghost" size="sm" className="mt-2 px-0">
          Open review queue
          <Icon name="arrow" size={14} />
        </Button>
      </div>
    </Card>
  );
}
