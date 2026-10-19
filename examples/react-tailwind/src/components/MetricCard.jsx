import { Badge, Card } from "builder-kit/ui";

import { Icon } from "./Icons";

function Sparkline({ points, trend }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden="true">
      {points.map((point, i) => {
        const height = 20 + ((point - min) / span) * 80;
        const latest = i === points.length - 1;
        const color = latest
          ? trend === "down"
            ? "bg-info"
            : "bg-accent"
          : trend === "down"
            ? "bg-info-subtle"
            : "bg-accent-subtle";
        return <span key={i} className={`w-full rounded-sm ${color}`} style={{ height: `${height}%` }} />;
      })}
    </div>
  );
}

/** UI: surface-2 / radius-panel / shadow-sm / t-caption / t-title / tnum */
export function MetricCard({ metric }) {
  const good = metric.trend === "down" ? metric.delta.startsWith("-") : metric.delta.startsWith("+");
  return (
    <Card compact className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-caption text-tertiary">{metric.label}</p>
        <Badge tone={good ? "success" : "warning"} icon={good ? "↑" : "!"}>
          {metric.delta}
        </Badge>
      </div>
      <p className="tnum mt-2 text-title font-semibold text-primary">{metric.value}</p>
      <div className="mt-3">
        <Sparkline points={metric.points} trend={metric.trend} />
      </div>
      <p className="mt-2 flex items-center gap-1 text-caption text-tertiary">
        <Icon name="clock" size={12} />
        Last 12 hours
      </p>
    </Card>
  );
}
