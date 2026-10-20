import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { AGENT_PROMPT, FRS_REGISTRY, barExtras, barLinks } from "virtual:beepress/host";

import { mountKit } from "../core/mount";
import "./react.less";

/**
 * React host adapter
 * ==================================================================
 * The toolkit UI is React, so a React prototype needs no bridge library —
 * only the three layout slots and a router contract.
 *
 *   <BeePressRoot router={router}>
 *     <App />
 *   </BeePressRoot>
 *
 * The component is dev-only in practice: import it behind
 * `if (import.meta.env.DEV)` from the host entry.
 */

/** Hash-router bridge that works without a router library. */
export function hashRouter() {
  const read = () => window.location.hash.replace(/^#/, "") || "/";
  return {
    current: read,
    subscribe(cb) {
      const onChange = () => cb(read());
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    href(route) {
      const path = typeof route === "string" ? route : (route?.path ?? "/");
      return `#${path}`;
    },
    push(path) {
      window.location.hash = path;
    },
  };
}

export function BuilderKitRoot({
  children,
  router,
  frsRegistry = FRS_REGISTRY,
  links = barLinks,
  extras = barExtras,
  agentPrompt = AGENT_PROMPT,
}) {
  const barRef = useRef(null);
  const contentRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    const kit = mountKit({
      slots: { bar: barRef.current, content: contentRef.current, drawer: drawerRef.current },
      frsRegistry,
      barLinks: links,
      agentPrompt,
      router: router ?? hashRouter(),
      mountExtras: extras?.length
        ? (el) => {
            const root = createRoot(el);
            root.render(
              <>
                {extras.map((Extra, i) => (
                  <Extra key={i} />
                ))}
              </>,
            );
            // Defer: React 19 StrictMode unmounts effects during render.
            return () => window.setTimeout(() => root.unmount(), 0);
          }
        : undefined,
    });
    // Defer unmount for the same reason; the container is ours, so a tick is safe.
    return () => window.setTimeout(() => kit.unmount(), 0);
  }, [agentPrompt, extras, frsRegistry, links, router]);

  return (
    <div className="review-shell">
      <div ref={barRef} className="bk-slot-bar" />
      <div className="rs-body">
        <div ref={contentRef} className="rs-content" data-review-root="">
          {children}
        </div>
        <div ref={drawerRef} className="bk-slot-drawer" />
      </div>
    </div>
  );
}

/** Bee Press name for the same adapter. */
export const BeePressRoot = BuilderKitRoot;
