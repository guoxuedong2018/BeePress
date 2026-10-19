import { useEffect } from "react";

import { Icon } from "./Icons";

/** UI: surface-2 / shadow-md / radius-lg / t-footnote / status + icon */
export function Toast({ message, tone = "success", onDone }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(id);
  }, [message, onDone]);

  if (!message) return null;

  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger";
  const icon = tone === "success" ? "check" : tone === "warning" ? "alert" : "alert";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-2.5 rounded-lg bg-surface-2 px-4 py-3 shadow-md anim-fade-up"
    >
      <Icon name={icon} size={16} className={`mt-0.5 ${color}`} />
      <p className="text-footnote text-primary wrap-pretty">{message}</p>
    </div>
  );
}
