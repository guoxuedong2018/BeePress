window.__ModuleLoader__.load({
  id: "@beepress/dsh-bundle",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;

    const ID = "@beepress/dsh-bundle";
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
      header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
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
      buttonPrimary: {
        border: `1px solid ${colors.accent}`,
        borderRadius: "6px",
        background: colors.accent,
        color: "#fff",
        cursor: "pointer",
        font: "inherit",
        padding: "3px 8px",
      },
      rootLine: { overflow: "hidden", color: colors.weak, textOverflow: "ellipsis", whiteSpace: "nowrap" },
      code: {
        borderRadius: "4px",
        background: colors.surface2,
        padding: "1px 4px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "11px",
      },
      metrics: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" },
      metric: { border: `1px solid ${colors.border}`, borderRadius: "6px", background: colors.surface2, padding: "7px 8px" },
      metricValue: { fontSize: "18px", fontWeight: 650, lineHeight: 1.1 },
      metricLabel: { color: colors.weak, fontSize: "11px" },
      section: { display: "flex", flexDirection: "column", gap: "6px" },
      sectionTitle: { fontSize: "11px", fontWeight: 650, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.weak },
      item: { border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "7px 8px", background: colors.surface },
      itemTitle: { fontWeight: 550, overflowWrap: "anywhere" },
      itemMeta: { color: colors.weak, fontSize: "11px", marginTop: "2px", overflowWrap: "anywhere" },
      row: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
      field: { display: "flex", flexDirection: "column", gap: "4px" },
      label: { color: colors.weak, fontSize: "10px", fontWeight: 650, letterSpacing: "0.03em", textTransform: "uppercase" },
      input: {
        width: "100%",
        boxSizing: "border-box",
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        background: colors.surface,
        color: colors.text,
        font: "inherit",
        padding: "5px 7px",
      },
      output: {
        margin: 0,
        maxHeight: "180px",
        overflow: "auto",
        borderRadius: "6px",
        background: "var(--dsh-surface-subtle, #f6f8fa)",
        padding: "8px",
        color: colors.weak,
        font: "11px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace",
        whiteSpace: "pre-wrap",
      },
      empty: { color: colors.weak, fontStyle: "italic" },
      error: { color: colors.danger, whiteSpace: "pre-wrap" },
      loading: { color: colors.weak },
      stageHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" },
      stageTitle: { fontSize: "15px", fontWeight: 650, letterSpacing: "-0.01em" },
      stageDesc: { marginTop: "2px", color: colors.weak, fontSize: "11px", lineHeight: 1.55 },
    };

    const STAGES = [
      { key: "baseline", title: "生产基线", description: "技术栈、UI 规范和项目上下文。", icon: "◈" },
      { key: "requirements", title: "需求", description: "FRS、验收和功能点规则。", icon: "▤" },
      { key: "prototype", title: "原型", description: "启动 dev server，用 DSH 浏览器查看。", icon: "▷" },
      { key: "review", title: "评审", description: "在真实原型页面上处理批注。", icon: "◎" },
      { key: "content", title: "内容", description: "内容锁、引用、截图和录屏。", icon: "▥" },
      { key: "publish", title: "发布", description: "目标适配器、dry-run 和发布状态。", icon: "↗" },
    ];

    const bridge = {
      openBrowser(url) {},
      openTerminal() {},
      openFiles() {},
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

    function Section({ title, action, children }) {
      return h(
        "section",
        { style: styles.section },
        h("div", { style: { ...styles.sectionTitle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } }, h("span", null, title), action || null),
        children,
      );
    }

    function Button({ primary = false, ...props }) {
      return h("button", { ...props, type: "button", style: primary ? styles.buttonPrimary : styles.button });
    }

    function Field({ label, children }) {
      return h("label", { style: styles.field }, h("span", { style: styles.label }, label), children);
    }

    async function request(path, body) {
      const response = await fetch(`${API_ROOT}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? { accept: "application/json" } : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Bee Press request failed: ${response.status}`);
      return data;
    }

    function useBeeState(cwd) {
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
      return [state, load];
    }

    function StageFrame({ stage, cwd, state, reload, children }) {
      return h(
        "div",
        { style: styles.root, "data-beepress-panel": stage.key },
        h(
          "div",
          { style: styles.stageHead },
          h("div", null, h("div", { style: styles.stageTitle }, stage.title), h("div", { style: styles.stageDesc }, stage.description)),
          h(Button, { onClick: reload, disabled: state.loading }, state.loading ? "刷新中…" : "刷新"),
        ),
        h("div", { style: styles.rootLine, title: cwd }, "Workspace: ", h("code", { style: styles.code }, cwd || "waiting for session")),
        !cwd
          ? h("div", { style: styles.loading }, "打开一个 Session 后使用 Bee Press。")
          : state.error
            ? h("div", { style: styles.error }, state.error)
            : state.loading && !state.data
              ? h("div", { style: styles.loading }, "读取 Bee Press 工作区…")
              : children,
      );
    }

    function BaselineStage({ stage, cwd, state, reload }) {
      const [stack, setStack] = React.useState("existing");
      const [uiPreset, setUiPreset] = React.useState("bee-press");
      const [output, setOutput] = React.useState("");
      React.useEffect(() => {
        if (state.data?.baseline) {
          setStack(state.data.baseline.stack || "existing");
          setUiPreset(state.data.baseline.uiPreset || "bee-press");
        }
      }, [state.data?.baseline?.stack, state.data?.baseline?.uiPreset]);
      const save = async () => {
        setOutput("Saving…");
        try {
          await request("/baseline", { root: cwd, stack, uiPreset });
          setOutput("基线已保存。");
          await reload();
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload },
        h(
          Section,
          { title: "技术栈" },
          h(
            Field,
            { label: "生产实现" },
            h(
              "select",
              { style: styles.input, value: stack, onChange: (event) => setStack(event.target.value) },
              h("option", { value: "react-tailwind" }, "React + Tailwind"),
              h("option", { value: "react" }, "React"),
              h("option", { value: "vue2" }, "Vue 2.7"),
              h("option", { value: "existing" }, "沿用项目现状"),
            ),
          ),
          h(
            Field,
            { label: "UI 规范" },
            h(
              "select",
              { style: styles.input, value: uiPreset, onChange: (event) => setUiPreset(event.target.value) },
              h("option", { value: "bee-press" }, "Bee Press UI Spec"),
              h("option", { value: "existing" }, "沿用现有产品"),
            ),
          ),
          h(Button, { primary: true, onClick: save }, "保存基线"),
          output ? h("pre", { style: styles.output }, output) : null,
        ),
      );
    }

    function RequirementsStage({ stage, cwd, state, reload }) {
      const [title, setTitle] = React.useState("");
      const [output, setOutput] = React.useState("");
      const features = state.data?.status?.docs?.features || { specs: 0, keys: [] };
      const create = async () => {
        setOutput("创建中…");
        try {
          const result = await request("/requirements/create", { root: cwd, title });
          setTitle("");
          setOutput(`已创建 ${result.relativePath}\n下一步：${result.checkCommand}`);
          await reload();
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      const check = async () => {
        setOutput("检查中…");
        try {
          const result = await request("/requirements/check", { root: cwd });
          setOutput(result.output || "FRS 校验通过。");
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload },
        h("div", { style: styles.metrics }, h(Metric, { label: "FRS", value: features.specs || 0 })),
        h(
          Section,
          { title: "需求规格" },
          features.keys?.length
            ? features.keys.map((key) => h("div", { key, style: styles.item }, h("div", { style: styles.itemTitle }, key), h("div", { style: styles.itemMeta }, "docs/features/", key, "/FRS.json")))
            : h("div", { style: styles.empty }, "还没有 FRS。新建一套需求件套开始。"),
        ),
        h(
          Section,
          { title: "新建 FRS" },
          h(Field, { label: "功能名称" }, h("input", { style: styles.input, value: title, placeholder: "例如：登录改版", onChange: (event) => setTitle(event.target.value) })),
          h("div", { style: styles.row }, h(Button, { primary: true, onClick: create, disabled: !title.trim() }, "新建件套"), h(Button, { onClick: check }, "检查 FRS")),
          output ? h("pre", { style: styles.output }, output) : null,
        ),
      );
    }

    function PrototypeStage({ stage, cwd, state, reload }) {
      const [output, setOutput] = React.useState("");
      const start = async () => {
        setOutput("正在启动 dev server…");
        try {
          const result = await request("/prototype/start", { root: cwd });
          setOutput(`已启动：${result.url}${result.reused ? "（复用）" : ""}`);
          bridge.openBrowser(result.url);
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload },
        h(
          Section,
          { title: "原型服务" },
          h("div", { style: styles.item }, h("div", { style: styles.itemTitle }, state.data?.status?.prototype?.devScript ? `npm run ${state.data.status.prototype.devScript}` : "未配置 dev 脚本"), h("div", { style: styles.itemMeta }, state.data?.status?.prototype?.dir || ".")),
          h(
            "div",
            { style: styles.row },
            h(Button, { primary: true, onClick: start }, "启动并在浏览器打开"),
            h(Button, { onClick: () => bridge.openTerminal() }, "打开终端"),
            h(Button, { onClick: () => bridge.openFiles() }, "浏览文件"),
          ),
          output ? h("pre", { style: styles.output }, output) : null,
        ),
      );
    }

    function ReviewStage({ stage, cwd, state, reload }) {
      const [output, setOutput] = React.useState("");
      const reviews = state.data?.reviews?.comments || [];
      const resolve = async (id) => {
        setOutput("处理批注…");
        try {
          await request("/review/resolve", { root: cwd, id });
          setOutput("批注已解决。");
          await reload();
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      const openReview = async () => {
        setOutput("正在打开评审页…");
        try {
          const result = await request("/prototype/start", { root: cwd });
          bridge.openBrowser(result.url);
          setOutput(`评审页：${result.url}`);
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload },
        h("div", { style: styles.metrics }, h(Metric, { label: "open reviews", value: state.data?.status?.docs?.reviews?.open ?? 0 })),
        h("div", { style: styles.row }, h(Button, { primary: true, onClick: openReview }, "打开评审页"), h(Button, { onClick: () => bridge.openBrowser("http://localhost:5173/") }, "打开 localhost:5173")),
        h(
          Section,
          { title: "待处理批注" },
          reviews.length
            ? reviews.slice(0, 12).map((review) =>
                h(
                  "div",
                  { key: review.id, style: styles.item },
                  h("div", { style: styles.itemTitle }, review.body),
                  h("div", { style: styles.itemMeta }, [review.author, review.route, review.frs].filter(Boolean).join(" · ")),
                  h("div", { style: { marginTop: "5px" } }, h(Button, { onClick: () => resolve(review.id) }, "解决")),
                ),
              )
            : h("div", { style: styles.empty }, "没有待处理批注。"),
        ),
        output ? h("pre", { style: styles.output }, output) : null,
      );
    }

    function ContentStage({ stage, cwd, state, reload }) {
      const [content, setContent] = React.useState(null);
      const [output, setOutput] = React.useState("");
      const check = async () => {
        setOutput("检查内容锁…");
        try {
          const query = new URLSearchParams({ root: cwd });
          const response = await fetch(`${API_ROOT}/content?${query}`, { headers: { accept: "application/json" } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `content request failed: ${response.status}`);
          setContent(data);
          setOutput("");
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      const capture = async (kind) => {
        setOutput(kind === "clip" ? "重建录屏…" : "重拍截图…");
        try {
          const result = await request("/content/capture", { root: cwd, kind });
          setOutput(result.output || "完成。");
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload },
        h("div", { style: styles.metrics }, h(Metric, { label: "KB pages", value: state.data?.status?.docs?.kb?.files ?? 0 }), h(Metric, { label: "open reviews", value: state.data?.status?.docs?.reviews?.open ?? 0 })),
        h("div", { style: styles.row }, h(Button, { primary: true, onClick: check }, "检查内容锁"), h(Button, { onClick: () => capture("shot") }, "重拍截图"), h(Button, { onClick: () => capture("clip") }, "重建录屏")),
        content
          ? h(
              "div",
              { style: styles.item },
              h("div", { style: styles.itemTitle }, `${content.summary?.pages ?? 0} pages · ${content.summary?.review ?? 0} need review`),
              h("div", { style: styles.itemMeta }, `${content.summary?.refsOpen ?? 0} open refs · ${content.summary?.backlog ?? 0} backlog · ${content.lock}`),
            )
          : h("div", { style: styles.empty }, "读取 docs/kb/_lock.json 查看待确认内容。"),
        output ? h("pre", { style: styles.output }, output) : null,
      );
    }

    function PublishStage({ stage, cwd, state, reload }) {
      const [output, setOutput] = React.useState("");
      const plan = state.data?.publish;
      const dryRun = async () => {
        setOutput("运行 dry-run…");
        try {
          const result = await request("/publish/dry-run", { root: cwd });
          setOutput(result.output || "dry-run 完成。");
          await reload();
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload },
        h(
          Section,
          { title: "发布计划" },
          h("div", { style: styles.item }, h("div", { style: styles.itemTitle }, plan?.configured ? plan?.destination || plan?.gateway || "已配置" : "未配置目标"), h("div", { style: styles.itemMeta }, `${plan?.publishedPages ?? 0} 已发布 · ${plan?.summary?.newPages ?? 0} 新增 · ${plan?.stateFile || "docs/kb/_published.json"}`)),
          h("div", { style: styles.row }, h(Button, { primary: true, onClick: dryRun }, "运行 dry-run")),
          output ? h("pre", { style: styles.output }, output) : null,
        ),
      );
    }

    const stageComponents = {
      baseline: BaselineStage,
      requirements: RequirementsStage,
      prototype: PrototypeStage,
      review: ReviewStage,
      content: ContentStage,
      publish: PublishStage,
    };

    function makeStageBody(stage) {
      const Component = stageComponents[stage.key];
      return function StageBody(props) {
        const cwd = typeof props.useSessions === "function" ? props.useSessions((sessions) => sessions.byId[props.sessionId]?.cwd) : undefined;
        const [state, reload] = useBeeState(cwd);
        return h(Component, { stage, cwd, state, reload });
      };
    }

    function install(ctx) {
      bridge.openBrowser = (url) => ctx.sidebarRight.openTab("browser", { params: { url } });
      bridge.openTerminal = () => ctx.sidebarRight.openTab("terminal");
      bridge.openFiles = () => ctx.sidebarRight.openTab("files");

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
              return { status: "handled", run: () => ctx.sidebarRight.openTabFromTarget("beepress-baseline", sessionTarget) };
            },
          }),
        "beepress: shortcut",
      );

      ctx.effect(
        () => ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({ name: "sidebar.brand.mark", priority: -100 }, BeeBrandMark)),
        "beepress: brand mark",
      );
      ctx.effect(
        () => ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({ name: "sidebar.brand.name", priority: -100 }, BeeBrandName)),
        "beepress: brand name",
      );

      for (const stage of STAGES) {
        const id = `${ID}/${stage.key}`;
        const kind = `beepress-${stage.key}`;
        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id,
              kind,
              priority: "extension",
              keepMounted: true,
              title: () => stage.title,
              guide: [
                {
                  id: stage.key,
                  order: 90 + STAGES.indexOf(stage),
                  title: () => stage.title,
                  description: () => stage.description,
                  icon: BeeIcon,
                },
              ],
            }),
          `beepress: tab ${stage.key}`,
        );
        ctx.effect(
          () => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: id }, makeStageBody(stage))),
          `beepress: body ${stage.key}`,
        );
        ctx.effect(
          () => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: id }, BeeTitle)),
          `beepress: title ${stage.key}`,
        );
      }
    }

    return {
      id: ID,
      name: "beepress-client",
      inject: ["slots", "sidebarRightTabs", "sidebarRight", "shortcuts", "uiWorkspace", "workspaces"],
      apply(ctx) {
        try {
          install(ctx);
        } catch (error) {
          console.error("[beepress] client apply failed", error);
          throw error;
        }
      },
    };
  },
});
