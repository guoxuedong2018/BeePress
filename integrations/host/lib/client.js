window.__ModuleLoader__.load({
  id: "@beepress/dsh-bundle",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;

    const ID = "@beepress/dsh-bundle";
    const KIND = "beepress";
    const API_ROOT = "/beepress/api";
    const API = `${API_ROOT}/state`;

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
      workflow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px" },
      workflowItem: { border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "6px 8px", background: colors.surface2 },
      workflowStage: { color: colors.weak, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.04em" },
      workflowValue: { marginTop: "2px", fontSize: "12px", fontWeight: 600 },
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

    function BeeIcon({ size = 16 } = {}) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
        h("path", { d: "M8 1.4 13.7 4.7v6.6L8 14.6 2.3 11.3V4.7L8 1.4Z", stroke: "currentColor", "stroke-width": 1.2 }),
        h("path", { d: "M5 6.2h6M5 8h6M5 9.8h6", stroke: "currentColor", "stroke-width": 1.2, "stroke-linecap": "round" }),
      );
    }

    function BeeTitle({ useTabInfo }) {
      const { tab } = useTabInfo();
      return h("span", { style: styles.brand }, h(BeeIcon), tab.title);
    }

    function BeeBrandMark() {
      return h("span", { style: { display: "flex", alignItems: "center", justifyContent: "center" } }, h(BeeIcon, { size: 24 }));
    }

    function BeeBrandName() {
      return h("span", { style: { fontWeight: 700, letterSpacing: "-0.02em" } }, "Bee Press");
    }

    function Metric({ label, value }) {
      return h("div", { style: styles.metric }, h("div", { style: styles.metricValue }, value), h("div", { style: styles.metricLabel }, label));
    }

    function BeeBody({ useSessions, sessionId }) {
      const cwd = typeof useSessions === "function" ? useSessions((sessions) => sessions.byId[sessionId]?.cwd) : undefined;
      const [state, setState] = React.useState({ loading: true, error: null, data: null });
      const [content, setContent] = React.useState({ loading: false, error: null, data: null });

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
            const response = await fetch(`${API_ROOT}/review/resolve`, {
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

      const loadContent = React.useCallback(async () => {
        if (!cwd) return;
        setContent({ loading: true, error: null, data: null });
        try {
          const query = new URLSearchParams({ root: cwd });
          const response = await fetch(`${API_ROOT}/content?${query}`, { headers: { accept: "application/json" } });
          if (!response.ok) throw new Error(`Bee Press content request failed: ${response.status}`);
          setContent({ loading: false, error: null, data: await response.json() });
        } catch (error) {
          setContent({ loading: false, error: error instanceof Error ? error.message : String(error), data: null });
        }
      }, [cwd]);

      const status = state.data?.status;
      const publish = state.data?.publish;
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
                    h("div", { style: styles.sectionTitle }, "Workflow"),
                    h(
                      "div",
                      { style: styles.workflow },
                      h("div", { style: styles.workflowItem }, h("div", { style: styles.workflowStage }, "需求规格"), h("div", { style: styles.workflowValue }, `${status?.docs?.features?.specs ?? 0} FRS`)),
                      h("div", { style: styles.workflowItem }, h("div", { style: styles.workflowStage }, "原型"), h("div", { style: styles.workflowValue }, status?.prototype?.devScript ? `dev: ${status.prototype.devScript}` : "not configured")),
                      h("div", { style: styles.workflowItem }, h("div", { style: styles.workflowStage }, "评审"), h("div", { style: styles.workflowValue }, `${status?.docs?.reviews?.open ?? 0} open`)),
                      h("div", { style: styles.workflowItem }, h("div", { style: styles.workflowStage }, "内容"), h("div", { style: styles.workflowValue }, `${status?.docs?.kb?.files ?? 0} pages`)),
                      h("div", { style: styles.workflowItem }, h("div", { style: styles.workflowStage }, "发布"), h("div", { style: styles.workflowValue }, publish?.configured ? "configured" : "not configured")),
                    ),
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
                    h(
                      "div",
                      { style: { ...styles.sectionTitle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } },
                      h("span", null, "Content lock"),
                      h("button", { type: "button", style: styles.button, onClick: loadContent, disabled: content.loading }, content.loading ? "Checking…" : "Check"),
                    ),
                    content.error
                      ? h("div", { style: styles.error }, content.error)
                      : content.data
                        ? h(
                            "div",
                            { style: styles.item },
                            h(
                              "div",
                              { style: styles.itemTitle },
                              `${content.data.summary?.pages ?? 0} pages · ${content.data.summary?.review ?? 0} need review`,
                            ),
                            h(
                              "div",
                              { style: styles.itemMeta },
                              `${content.data.summary?.refsOpen ?? 0} open refs · ${content.data.summary?.backlog ?? 0} backlog · ${content.data.lock}`,
                            ),
                          )
                        : h("div", { style: styles.empty }, "Read docs/kb/_lock.json to see what needs a human."),
                  ),
                  h(
                    "section",
                    { style: styles.section },
                    h("div", { style: styles.sectionTitle }, "Publish plan"),
                    h(
                      "div",
                      { style: styles.item },
                      h("div", { style: styles.itemTitle }, publish?.configured ? publish?.destination || publish?.gateway || "Configured" : "No destination configured"),
                      h(
                        "div",
                        { style: styles.itemMeta },
                        `${publish?.publishedPages ?? 0} published · ${publish?.summary?.newPages ?? 0} new · ${publish?.stateFile || "docs/kb/_published.json"}`,
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
                    status?.generatedAt ? `Updated ${new Date(status.generatedAt).toLocaleTimeString()}` : "",
                  ),
                ),
      );
    }

    const inject = ["slots", "sidebarRightTabs", "sidebarRight", "shortcuts", "uiWorkspace", "workspaces"];

    function install(ctx) {
      window.__beepressDesktop = {
        async openProject(root) {
          const workspace = await ctx.workspaces.create({ path: root });
          await ctx.uiWorkspace.openWorkspace(workspace.workspaceId);
          return { workspaceId: workspace.workspaceId, path: root };
        },
      };

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
          ctx.slots.inject("sidebar.brand.mark", () =>
            ctx.slots.register({ name: "sidebar.brand.mark", priority: -100 }, BeeBrandMark),
          ),
        "beepress: brand mark",
      );

      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.brand.name", () =>
            ctx.slots.register({ name: "sidebar.brand.name", priority: -100 }, BeeBrandName),
          ),
        "beepress: brand name",
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
