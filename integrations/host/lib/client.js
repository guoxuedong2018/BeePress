window.__ModuleLoader__.load({
  id: "@beepress/dsh-bundle",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;

    const ID = "@beepress/dsh-bundle";
    const KIND = "beepress";
    const API = "/beepress/api/state";

    const colors = {
      text: "var(--dsh-text-primary, #1f2328)",
      weak: "var(--dsh-text-secondary, #656d76)",
      border: "var(--dsh-border-default, #d8dee4)",
      surface: "var(--dsh-surface-default, #ffffff)",
      surface2: "var(--dsh-surface-subtle, #f6f8fa)",
      accent: "var(--dsh-accent-default, #0969da)",
      danger: "var(--dsh-danger-default, #cf222e)",
    };

    const styles = {
      root: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
        minHeight: 0,
        padding: "12px",
        overflow: "auto",
        color: colors.text,
        background: colors.surface,
        font: "13px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif",
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      },
      brand: { display: "flex", alignItems: "center", gap: "6px", fontWeight: 650 },
      button: {
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        background: colors.surface2,
        color: colors.text,
        cursor: "pointer",
        font: "inherit",
        padding: "3px 8px",
      },
      rootLine: {
        overflow: "hidden",
        color: colors.weak,
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      code: {
        borderRadius: "4px",
        background: colors.surface2,
        padding: "1px 4px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "11px",
      },
      metrics: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" },
      metric: {
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        background: colors.surface2,
        padding: "7px 8px",
      },
      metricValue: { fontSize: "18px", fontWeight: 650, lineHeight: 1.1 },
      metricLabel: { color: colors.weak, fontSize: "11px" },
      section: { display: "flex", flexDirection: "column", gap: "6px" },
      sectionTitle: { fontSize: "11px", fontWeight: 650, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.weak },
      item: {
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        padding: "7px 8px",
        background: colors.surface,
      },
      itemTitle: { fontWeight: 550 },
      itemMeta: { color: colors.weak, fontSize: "11px", marginTop: "2px" },
      empty: { color: colors.weak, fontStyle: "italic" },
      error: { color: colors.danger, whiteSpace: "pre-wrap" },
      loading: { color: colors.weak },
    };

    function BeeIcon() {
      return h(
        "svg",
        { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
        h("path", { d: "M8 1.4 13.7 4.7v6.6L8 14.6 2.3 11.3V4.7L8 1.4Z", stroke: "currentColor", "stroke-width": 1.2 }),
        h("path", { d: "M5 6.2h6M5 8h6M5 9.8h6", stroke: "currentColor", "stroke-width": 1.2, "stroke-linecap": "round" }),
      );
    }

    function BeeTitle({ useTabInfo }) {
      const { tab } = useTabInfo();
      return h("span", { style: styles.brand }, h(BeeIcon), tab.title);
    }

    function Metric({ label, value }) {
      return h("div", { style: styles.metric }, h("div", { style: styles.metricValue }, value), h("div", { style: styles.metricLabel }, label));
    }

    function BeeBody({ useSessions, sessionId }) {
      const cwd = typeof useSessions === "function" ? useSessions((sessions) => sessions.byId[sessionId]?.cwd) : undefined;
      const [state, setState] = React.useState({ loading: true, error: null, data: null });

      const load = React.useCallback(async () => {
        if (!cwd) return;
        setState((current) => ({ ...current, loading: true, error: null }));
        try {
          const query = new URLSearchParams({ root: cwd });
          const response = await fetch(`${API}?${query}`, { headers: { accept: "application/json" } });
          if (!response.ok) throw new Error(`Bee Press state request failed: ${response.status}`);
          setState({ loading: false, error: null, data: await response.json() });
        } catch (error) {
          setState({ loading: false, error: error instanceof Error ? error.message : String(error), data: null });
        }
      }, [cwd]);

      React.useEffect(() => {
        load();
      }, [load]);

      const resolve = React.useCallback(
        async (id) => {
          try {
            const response = await fetch(`${API}/review/resolve`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ root: cwd, id }),
            });
            if (!response.ok) throw new Error(`Bee Press review resolve failed: ${response.status}`);
            await load();
          } catch (error) {
            setState((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
          }
        },
        [cwd, load],
      );

      const status = state.data?.status;
      const pages = status?.docs?.kb?.pages || [];
      const reviews = state.data?.reviews?.comments || [];

      return h(
        "div",
        { style: styles.root, "data-beepress-panel": true },
        h(
          "div",
          { style: styles.header },
          h("div", { style: styles.brand }, h(BeeIcon), "Bee Press"),
          h("button", { type: "button", style: styles.button, onClick: load, disabled: state.loading }, state.loading ? "Refreshing…" : "Refresh"),
        ),
        h("div", { style: styles.rootLine, title: cwd }, "Workspace: ", h("code", { style: styles.code }, cwd || "waiting for session")),
        !cwd
          ? h("div", { style: styles.loading }, "Open a session to inspect its Bee Press workspace.")
          : state.loading && !state.data
            ? h("div", { style: styles.loading }, "Reading Bee Press workspace…")
            : state.error
              ? h("div", { style: styles.error }, state.error)
              : h(
                  React.Fragment,
                  null,
                  h(
                    "div",
                    { style: styles.metrics },
                    h(Metric, { label: "pages", value: status?.docs?.kb?.files ?? 0 }),
                    h(Metric, { label: "open reviews", value: status?.docs?.reviews?.open ?? 0 }),
                    h(Metric, { label: "specs", value: status?.docs?.features?.specs ?? 0 }),
                  ),
                  h(
                    "section",
                    { style: styles.section },
                    h("div", { style: styles.sectionTitle }, "Content"),
                    pages.length === 0
                      ? h("div", { style: styles.empty }, "No docs/kb pages yet.")
                      : pages.slice(0, 10).map((page) =>
                          h(
                            "div",
                            { key: page.file, style: styles.item },
                            h("div", { style: styles.itemTitle }, page.title || page.file),
                            h("div", { style: styles.itemMeta }, page.file),
                          ),
                        ),
                  ),
                  h(
                    "section",
                    { style: styles.section },
                    h("div", { style: styles.sectionTitle }, "Open reviews"),
                    reviews.length === 0
                      ? h("div", { style: styles.empty }, "No open review comments.")
                      : reviews.slice(0, 10).map((review) =>
                          h(
                            "div",
                            { key: review.id, style: { ...styles.item, display: "flex", gap: "8px", alignItems: "flex-start", justifyContent: "space-between" } },
                            h(
                              "div",
                              { style: { minWidth: 0 } },
                              h("div", { style: styles.itemTitle }, review.body),
                              h(
                                "div",
                                { style: styles.itemMeta },
                                [review.author, review.route, review.frs].filter(Boolean).join(" · "),
                              ),
                            ),
                            h("button", { type: "button", style: styles.button, onClick: () => resolve(review.id) }, "Resolve"),
                          ),
                        ),
                  ),
                  h(
                    "div",
                    { style: styles.itemMeta },
                    status?.publish?.configured ? "Publish destination configured" : "Publish destination not configured",
                    status?.generatedAt ? ` · ${new Date(status.generatedAt).toLocaleTimeString()}` : "",
                  ),
                ),
      );
    }

    const inject = ["slots", "sidebarRightTabs", "sidebarRight", "shortcuts"];

    function install(ctx) {
      ctx.effect(
        () =>
          ctx.shortcuts.register({
            id: "beepress.open",
            label: () => "Bee Press",
            aliases: ["bee press", "content check"],
            defaults: {},
            regions: ["page", "editable", "terminal"],
            modals: [],
            resolve: ({ target }) => {
              const sessionTarget = ctx.sidebarRight.commandTarget(target);
              if (!sessionTarget) return { status: "blocked", reason: "Open a session first" };
              return { status: "handled", run: () => ctx.sidebarRight.openTabFromTarget(KIND, sessionTarget) };
            },
          }),
        "beepress: shortcut",
      );

      ctx.effect(
        () =>
          ctx.sidebarRightTabs.register({
            id: ID,
            kind: KIND,
            priority: "extension",
            title: () => "Bee Press",
            guide: [
              {
                id: "beepress",
                commandId: "beepress.open",
                order: 90,
                title: () => "Bee Press",
                description: () => "Content pages, open reviews and workspace health.",
                icon: BeeIcon,
              },
            ],
          }),
        "beepress: sidebar tab",
      );

      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.right.pane.tab", () =>
            ctx.slots.register({ name: "sidebar.right.pane.tab", key: ID }, BeeBody),
          ),
        "beepress: sidebar body",
      );

      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.right.pane.tab.title", () =>
            ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: ID }, BeeTitle),
          ),
        "beepress: sidebar title",
      );
    }

    function apply(ctx) {
      try {
        install(ctx);
      } catch (error) {
        console.error("[beepress] client apply failed", error);
        throw error;
      }
    }

    return { id: ID, name: "beepress-client", inject, apply };
  },
});
