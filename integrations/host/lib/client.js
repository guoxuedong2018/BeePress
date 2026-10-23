window.__ModuleLoader__.load({
  id: "@builderharness/dsh-bundle",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;

    const ID = "@builderharness/dsh-bundle";
    const API_ROOT = "/builderharness/api";
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
      embeddedBody: { display: "flex", flexDirection: "column", gap: "14px" },
    };

    const STAGES = [
      { key: "baseline", title: "生产基线", description: "技术栈、UI 规范和项目上下文。", icon: "◈" },
      { key: "requirements", title: "需求", description: "FRS、验收和功能点规则。", icon: "▤" },
      { key: "prototype", title: "原型", description: "启动 dev server，用 DSH 浏览器查看。", icon: "▷" },
      { key: "review", title: "评审", description: "在真实原型页面上处理批注。", icon: "◎" },
      { key: "content", title: "内容", description: "内容锁、引用、截图和录屏。", icon: "▥" },
      { key: "publish", title: "发布", description: "目标适配器、dry-run 和发布状态。", icon: "↗" },
    ];

    const COCKPIT_PANEL_ID = "builderharness-workbench";
    const REVIEW_CHANNEL = "builderharness-review";
    const EMBED_QUERY = "builderharness_embed";

    const bridge = {
      openBrowser(url) {},
      openTerminal() {},
      openFiles() {},
      openChat() {},
      openWorkbench() {},
      pickProject() {},
      startSession() {},
    };

    function BeeIcon({ size = 16 } = {}) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
        h("path", { d: "M8 1.4 13.7 4.7v6.6L8 14.6 2.3 11.3V4.7L8 1.4Z", stroke: "currentColor", "stroke-width": 1.2 }),
        h("path", { d: "M5 6.2h6M5 8h6M5 9.8h6", stroke: "currentColor", "stroke-width": 1.2, "stroke-linecap": "round" }),
      );
    }

    const ICON_PATHS = {
      baseline: "M3 5h10M3 11h10M6 3v4M10 9v4",
      requirements: "M4 2.5h5l3 3v8H4zM9 2.5v3h3M6 8.5h4M6 10.5h4",
      prototype: "M5.5 4.2 12 8l-6.5 3.8z",
      review: "M3 3.5h10v7H8l-3 2.5v-2.5H3z",
      content: "M8 2.2 14 5.5 8 8.8 2 5.5zM2 8.6 8 12l6-3.4M2 11.4 8 14.8l6-3.4",
      publish: "M8 10.5V2.8M5 5.8 8 2.8l3 3M3.5 9.5v3h9v-3",
      refresh: "M13 8a5 5 0 1 1-1.6-3.7M13 2.5V5h-2.5",
      help: "M6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.7-.8 1.2v.3M8 11.6v.4",
      chat: "M3 3.5h10v7.2H8.2L5.4 13v-2.3H3z",
      comments: "M2.5 3.5h7v5h-4L3.8 10v-1.5H2.5zM11 6.2h2.5v5h-1.3V13l-1.8-1.8H9",
      panel: "M3 3.5h10v9H3zM9.5 3.5v9",
      external: "M9 3.5h3.5V7M12.5 3.5 8 8M6.5 4.5H4v7.5h7.5V9.5",
      monitor: "M2.5 4h11v6.5h-11zM6 13h4M8 10.5V13",
      tablet: "M4 2.8h8v10.4H4zM7 11.8h2",
      phone: "M5.5 2.6h5v10.8h-5zM7 11.8h2",
      close: "M4 4l8 8M12 4l-8 8",
      sparkles: "M8 2.5 9.2 6 12.5 7.2 9.2 8.4 8 12 6.8 8.4 3.5 7.2 6.8 6zM12 11l.5 1.4L14 13l-1.5.6L12 15l-.5-1.4L10 13l1.5-.6z",
      chevron: "M6.5 4 10 8l-3.5 4",
    };

    function Icon({ name, size = 15, filled = false }) {
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: filled ? "currentColor" : "none",
          stroke: "currentColor",
          "stroke-width": filled ? 0 : 1.3,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "aria-hidden": true,
          focusable: "false",
        },
        h("path", { d: ICON_PATHS[name] || ICON_PATHS.help }),
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
      return h("span", { style: { fontWeight: 700, letterSpacing: "-0.02em" } }, "BuilderHarness");
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
      if (!response.ok) throw new Error(data.error || `BuilderHarness request failed: ${response.status}`);
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
          if (!response.ok) throw new Error(`BuilderHarness state request failed: ${response.status}`);
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

    function StageFrame({ stage, cwd, state, reload, embedded = false, children }) {
      const body = !cwd
        ? h("div", { style: styles.loading }, "打开一个 Session 后使用 BuilderHarness。")
        : state.error
          ? h("div", { style: styles.error }, state.error)
          : state.loading && !state.data
            ? h("div", { style: styles.loading }, "读取 BuilderHarness 工作区…")
            : children;
      if (embedded) return h("div", { style: styles.embeddedBody, "data-builderharness-panel": stage.key }, body);
      return h(
        "div",
        { style: styles.root, "data-builderharness-panel": stage.key },
        h(
          "div",
          { style: styles.stageHead },
          h("div", null, h("div", { style: styles.stageTitle }, stage.title), h("div", { style: styles.stageDesc }, stage.description)),
          h(Button, { onClick: reload, disabled: state.loading }, state.loading ? "刷新中…" : "刷新"),
        ),
        h("div", { style: styles.rootLine, title: cwd }, "Workspace: ", h("code", { style: styles.code }, cwd || "waiting for session")),
        body,
      );
    }

    function BaselineStage({ stage, cwd, state, reload, embedded }) {
      const [stack, setStack] = React.useState("existing");
      const [uiPreset, setUiPreset] = React.useState("builderharness");
      const [output, setOutput] = React.useState("");
      const detected = state.data?.baseline?.detected;
      React.useEffect(() => {
        if (state.data?.baseline) {
          setStack(state.data.baseline.stack || "existing");
          setUiPreset(state.data.baseline.uiPreset === "bee-press" ? "builderharness" : state.data.baseline.uiPreset || "builderharness");
        }
      }, [state.data?.baseline?.stack, state.data?.baseline?.uiPreset]);
      const save = async (nextStack = stack, nextPreset = uiPreset) => {
        setOutput("Saving…");
        try {
          await request("/baseline", { root: cwd, stack: nextStack, uiPreset: nextPreset });
          setOutput("基线已保存。");
          await reload();
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload, embedded },
        detected?.stack
          ? h(
              Section,
              { title: "检测结果" },
              h("div", { style: styles.item },
                h("div", { style: styles.itemTitle }, `检测到 ${detected.label || detected.stack}`),
                h("div", { style: styles.itemMeta }, [detected.appDir ? `应用目录 ${detected.appDir}` : null, detected.typescript ? "TypeScript" : null, detected.bundler || null].filter(Boolean).join(" · ") || "来自 package.json"),
              ),
              detected.evidence?.length ? h("div", { style: styles.itemMeta }, detected.evidence.join(" · ")) : null,
              h(Button, { primary: true, onClick: () => save(detected.stack, "builderharness") }, "采用检测结果"),
            )
          : h(Section, { title: "检测结果" }, h("div", { style: styles.empty }, "没识别出技术栈。手动选择下面的选项即可，之后可以改。")),
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
              h("option", { value: "builderharness" }, "BuilderHarness UI Spec"),
              h("option", { value: "existing" }, "沿用现有产品"),
            ),
          ),
          h(Button, { primary: true, onClick: () => save() }, "保存基线"),
          output ? h("pre", { style: styles.output }, output) : null,
        ),
      );
    }

    function RequirementsStage({ stage, cwd, state, reload, embedded }) {
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
        { stage, cwd, state, reload, embedded },
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

    function PrototypeStage({ stage, cwd, state, reload, embedded }) {
      const [output, setOutput] = React.useState("");
      const prototype = state.data?.status?.prototype || {};
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
      const install = async () => {
        setOutput("正在安装依赖…");
        try {
          await request("/prototype/install", { root: cwd });
          await reload();
          setOutput("依赖已安装，可以启动原型。");
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        StageFrame,
        { stage, cwd, state, reload, embedded },
        h(
          Section,
          { title: "原型服务" },
          h(
            "div",
            { style: styles.item },
            h("div", { style: styles.itemTitle }, prototype.devScript ? `${prototype.packageManager || "npm"} run ${prototype.devScript}` : "没找到 dev 脚本"),
            h("div", { style: styles.itemMeta }, prototype.reason || prototype.dir || "."),
          ),
          h(
            "div",
            { style: styles.row },
            h(Button, { primary: true, onClick: start }, "启动并在浏览器打开"),
            prototype.found && prototype.installed === false ? h(Button, { onClick: install }, "安装依赖") : null,
            h(Button, { onClick: () => bridge.openTerminal() }, "打开终端"),
            h(Button, { onClick: () => bridge.openFiles() }, "浏览文件"),
          ),
          output ? h("pre", { style: styles.output }, output) : null,
        ),
      );
    }

    function ReviewStage({ stage, cwd, state, reload, embedded }) {
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
        { stage, cwd, state, reload, embedded },
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

    function ContentStage({ stage, cwd, state, reload, embedded }) {
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
        { stage, cwd, state, reload, embedded },
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

    function PublishStage({ stage, cwd, state, reload, embedded }) {
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
        { stage, cwd, state, reload, embedded },
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

    const cockpitCss = `
      .bp-cockpit {
        --bp-accent: var(--dsh-accent-default, #3b6ef5);
        --bp-success: var(--dsh-success-default, #1a7f37);
        --bp-warning: var(--dsh-warning-default, #9a6700);
        --bp-danger: var(--dsh-danger-default, #cf222e);
        --bp-bg: var(--dsh-surface-subtle, #f5f5f4);
        --bp-card: var(--dsh-surface-default, #ffffff);
        --bp-border: var(--dsh-border-default, #e4e4e2);
        --bp-text: var(--dsh-text-primary, #1f2328);
        --bp-muted: var(--dsh-text-secondary, #6b7280);
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        color: var(--bp-text);
        background: var(--bp-bg);
        font: 13px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .bp-cockpit *, .bp-cockpit *::before, .bp-cockpit *::after { box-sizing: border-box; }
      .bp-shell { display: flex; flex: 1; min-height: 0; }
      .bp-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        width: 46px;
        flex: none;
        padding: 10px 0;
        border-right: 1px solid var(--bp-border);
      }
      .bp-rail-spacer { flex: 1; min-height: 8px; }
      .bp-rail-item {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        color: color-mix(in srgb, var(--bp-muted) 74%, var(--bp-text));
        background: transparent;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
      }
      .bp-rail-item:hover { color: var(--bp-text); background: color-mix(in srgb, var(--bp-text) 6%, transparent); }
      .bp-rail-item[data-active="true"] { color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 10%, transparent); }
      .bp-rail-dot { position: absolute; right: 5px; bottom: 5px; width: 4px; height: 4px; border-radius: 50%; background: transparent; }
      .bp-rail-item[data-ready="true"] .bp-rail-dot { background: var(--bp-success); }
      .bp-stage-area { position: relative; display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }
      .bp-canvas-body { flex: 1; min-height: 0; overflow: auto; margin: 8px; padding: 22px 24px 32px; background: var(--bp-card); border: 1px solid var(--bp-border); border-radius: 12px; }
      .bp-canvas-body > * { width: 100%; max-width: 860px; margin: 0 auto; }
      .bp-floatbar {
        position: absolute;
        top: 10px;
        right: 12px;
        z-index: 6;
        display: flex;
        align-items: center;
        gap: 1px;
        padding: 3px 4px;
        background: color-mix(in srgb, var(--bp-card) 86%, transparent);
        border: 1px solid var(--bp-border);
        border-radius: 10px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, .05);
        backdrop-filter: blur(8px);
      }
      .bp-workspace { max-width: 150px; margin: 0 6px; overflow: hidden; color: var(--bp-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
      .bp-icon-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 27px;
        height: 27px;
        color: var(--bp-muted);
        background: transparent;
        border: 0;
        border-radius: 7px;
        cursor: pointer;
      }
      .bp-icon-btn:hover:not(:disabled) { color: var(--bp-text); background: color-mix(in srgb, var(--bp-text) 7%, transparent); }
      .bp-icon-btn[data-on="true"] { color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 12%, transparent); }
      .bp-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
      .bp-icon-badge { position: absolute; top: 1px; right: 0; min-width: 13px; padding: 0 3px; color: #fff; background: var(--bp-accent); border-radius: 999px; font-size: 8px; line-height: 13px; text-align: center; }
      .bp-next-chip {
        position: absolute;
        left: 50%;
        bottom: 14px;
        z-index: 6;
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: min(520px, calc(100% - 40px));
        padding: 7px 12px;
        color: var(--bp-text);
        background: color-mix(in srgb, var(--bp-card) 92%, transparent);
        border: 1px solid var(--bp-border);
        border-radius: 999px;
        box-shadow: 0 4px 16px rgba(15, 23, 42, .08);
        font-size: 11px;
        cursor: pointer;
        transform: translateX(-50%);
      }
      .bp-next-chip > span:first-child { color: var(--bp-muted); }
      .bp-next-chip:hover { border-color: color-mix(in srgb, var(--bp-accent) 40%, var(--bp-border)); }
      .bp-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 28px;
        padding: 0 10px;
        color: var(--bp-text);
        background: transparent;
        border: 1px solid var(--bp-border);
        border-radius: 7px;
        font: inherit;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
      }
      .bp-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--bp-text) 6%, transparent); }
      .bp-btn:disabled { opacity: .45; cursor: not-allowed; }
      .bp-btn-primary { color: #fff; background: var(--bp-accent); border-color: var(--bp-accent); }
      .bp-btn-primary:hover:not(:disabled) { color: #fff; filter: brightness(.96); }
      .bp-link { padding: 0; color: var(--bp-muted); background: none; border: 0; font: inherit; font-size: 11px; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
      .bp-btn:focus-visible, .bp-rail-item:focus-visible, .bp-input:focus-visible, .bp-icon-btn:focus-visible, .bp-start-step:focus-visible, .bp-next-chip:focus-visible { outline: 2px solid var(--bp-accent); outline-offset: 2px; }
      .bp-input { height: 28px; min-width: 180px; padding: 0 9px; color: inherit; background: var(--bp-card); border: 1px solid var(--bp-border); border-radius: 7px; font: inherit; font-size: 11px; }
      .bp-panel {
        position: absolute;
        top: 8px;
        right: 8px;
        bottom: 8px;
        z-index: 12;
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 296px;
        overflow: auto;
        padding: 12px;
        background: var(--bp-card);
        border: 1px solid var(--bp-border);
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, .14);
      }
      .bp-panel-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
      .bp-panel-block { display: flex; flex-direction: column; gap: 6px; }
      .bp-panel-label { color: var(--bp-muted); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .bp-panel-item { padding: 9px; border: 1px solid var(--bp-border); border-radius: 9px; }
      .bp-panel-item .bp-btn { height: 22px; margin-top: 6px; padding: 0 7px; font-size: 9px; }
      .bp-panel-empty { color: var(--bp-muted); font-size: 11px; line-height: 1.6; }
      .bp-next { padding: 10px; background: color-mix(in srgb, var(--bp-accent) 4%, var(--bp-card)); border: 1px solid color-mix(in srgb, var(--bp-accent) 18%, var(--bp-border)); border-radius: 9px; }
      .bp-next-title { font-size: 12px; font-weight: 650; }
      .bp-next-detail { margin-top: 3px; color: var(--bp-muted); font-size: 10px; line-height: 1.55; }
      .bp-next .bp-btn { margin-top: 8px; }
      .bp-review-body { display: -webkit-box; overflow: hidden; font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
      .bp-review-meta { margin-top: 4px; color: var(--bp-muted); font-size: 9px; line-height: 1.5; overflow-wrap: anywhere; }
      .bp-help {
        position: absolute;
        top: 48px;
        right: 12px;
        z-index: 20;
        width: min(340px, calc(100% - 24px));
        padding: 12px;
        background: var(--bp-card);
        border: 1px solid var(--bp-border);
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, .16);
      }
      .bp-help-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
      .bp-help-list { display: flex; flex-direction: column; gap: 7px; }
      .bp-help-item { display: flex; gap: 7px; color: var(--bp-muted); font-size: 10px; line-height: 1.55; }
      .bp-help-item b { display: block; color: var(--bp-text); font-size: 11px; font-weight: 600; }
      .bp-help-icon { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; margin-top: 1px; color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 8%, transparent); border-radius: 4px; font-size: 9px; }
      .bp-help-title { margin: 12px 0 6px; color: var(--bp-muted); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .bp-help-keys > div { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; color: var(--bp-muted); font-size: 10px; }
      .bp-help-keys kbd { min-width: 54px; padding: 1px 6px; color: var(--bp-text); background: var(--bp-bg); border: 1px solid var(--bp-border); border-radius: 4px; font: inherit; font-size: 9px; text-align: center; }
      .bp-help > .bp-btn { width: 100%; margin-top: 10px; justify-content: center; }
      .bp-preview-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; margin: 8px; overflow: hidden; background: var(--bp-card); border: 1px solid var(--bp-border); border-radius: 12px; }
      .bp-canvas-bar { display: flex; align-items: center; gap: 10px; flex: none; min-height: 38px; padding: 0 8px 0 12px; background: color-mix(in srgb, var(--bp-bg) 52%, var(--bp-card)); border-bottom: 1px solid var(--bp-border); }
      .bp-canvas-url { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--bp-muted); font-size: 10px; }
      .bp-canvas-url code { max-width: 34vw; overflow: hidden; color: var(--bp-text); font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }
      .bp-route { color: var(--bp-muted); }
      .bp-live { width: 6px; height: 6px; flex: none; background: var(--bp-success); border-radius: 50%; }
      .bp-live[data-off="true"] { background: var(--bp-muted); opacity: .45; }
      .bp-canvas-frs { display: flex; align-items: center; gap: 4px; margin-left: auto; min-width: 0; overflow: hidden; }
      .bp-tag { padding: 1px 6px; color: var(--bp-muted); background: var(--bp-bg); border: 1px solid var(--bp-border); border-radius: 5px; font-size: 9px; white-space: nowrap; }
      .bp-tag-open { color: var(--bp-accent); border-color: color-mix(in srgb, var(--bp-accent) 30%, var(--bp-border)); }
      .bp-warn { color: var(--bp-warning); font-size: 10px; }
      .bp-canvas-actions { display: flex; align-items: center; gap: 1px; flex: none; }
      .bp-preview-stage { position: relative; display: flex; flex: 1; min-height: 0; padding: 10px; background: var(--bp-bg); }
      .bp-preview-frame { position: relative; width: 100%; height: 100%; min-height: 320px; margin: 0 auto; overflow: hidden; background: #fff; border: 1px solid var(--bp-border); border-radius: 8px; transition: max-width .18s ease; }
      .bp-preview-frame iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
      .bp-preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; flex: 1; min-height: 260px; padding: 28px; color: var(--bp-muted); text-align: center; }
      .bp-preview-empty strong { color: var(--bp-text); font-size: 13px; font-weight: 650; }
      .bp-preview-empty span { max-width: 460px; line-height: 1.65; font-size: 11px; }
      .bp-preview-empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 4px; }
      .bp-preview-meta { padding: 4px 8px; color: var(--bp-text); background: var(--bp-bg); border: 1px solid var(--bp-border); border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; }
      .bp-preview-scanned { color: var(--bp-muted); font-size: 9px; opacity: .8; }
      .bp-banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; color: var(--bp-warning); background: color-mix(in srgb, var(--bp-warning) 7%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--bp-warning) 24%, transparent); font-size: 10px; }
      .bp-banner span { flex: 1; }
      .bp-skeleton { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 260px; padding: 14px; }
      .bp-skeleton-bar { display: flex; align-items: center; gap: 6px; color: var(--bp-muted); font-size: 10px; }
      .bp-skeleton-dot { width: 6px; height: 6px; background: var(--bp-accent); border-radius: 50%; animation: bp-pulse 1.1s ease-in-out infinite; }
      .bp-skeleton-canvas { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 10px; padding: 24px; background: var(--bp-bg); border-radius: 8px; }
      .bp-skeleton-line { height: 12px; background: linear-gradient(90deg, #eceef0, #e2e5e8, #eceef0); background-size: 200% 100%; border-radius: 6px; animation: bp-shimmer 1.5s linear infinite; }
      .bp-skeleton-detail { margin: 0; color: var(--bp-muted); font-size: 10px; }
      .bp-error { padding: 9px 10px; color: var(--bp-danger); font-size: 11px; white-space: pre-wrap; }
      .bp-error-brief { width: 100%; max-height: 64px; overflow: auto; margin: 0; padding: 8px; color: var(--bp-danger); background: var(--bp-bg); border: 1px solid var(--bp-border); border-radius: 6px; font: 10px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: left; white-space: pre-wrap; }
      .bp-log { width: 100%; max-height: 190px; overflow: auto; margin: 0; padding: 8px; color: #e2e8f0; background: #0f172a; border-radius: 6px; font: 10px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: left; white-space: pre-wrap; }
      .bp-start-wrap { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; overflow: auto; padding: 32px 20px; }
      .bp-start-card { width: min(560px, 100%); padding: 16px 18px; background: var(--bp-card); border: 1px solid var(--bp-border); border-radius: 14px; box-shadow: 0 8px 28px rgba(15, 23, 42, .06); }
      .bp-start-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .bp-kicker { color: var(--bp-muted); font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .bp-start-head h2 { margin: 4px 0 0; font-size: 17px; font-weight: 700; letter-spacing: -.02em; }
      .bp-start-steps { display: flex; gap: 4px; margin: 14px 0 12px; }
      .bp-start-step { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 4px; color: var(--bp-muted); background: var(--bp-bg); border: 1px solid transparent; border-radius: 999px; font: inherit; font-size: 10px; cursor: pointer; }
      .bp-start-step[data-active="true"] { color: var(--bp-text); border-color: color-mix(in srgb, var(--bp-accent) 34%, var(--bp-border)); background: color-mix(in srgb, var(--bp-accent) 7%, var(--bp-card)); }
      .bp-start-step[data-done="true"] { color: var(--bp-success); }
      .bp-start-step-dot { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; border-radius: 50%; background: var(--bp-card); font-size: 8px; }
      .bp-start-step[data-active="true"] .bp-start-step-dot { color: #fff; background: var(--bp-accent); }
      .bp-start-step[data-done="true"] .bp-start-step-dot { color: var(--bp-success); background: color-mix(in srgb, var(--bp-success) 14%, transparent); }
      .bp-start-body { min-height: 86px; }
      .bp-start-desc { margin: 0 0 10px; color: var(--bp-muted); font-size: 11px; line-height: 1.65; }
      .bp-start-evidence { margin: -4px 0 10px; color: var(--bp-muted); font: 9px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
      .bp-start-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      .bp-start-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--bp-border); color: var(--bp-muted); font-size: 10px; }
      .bp-empty { flex: 1; min-height: 0; overflow: auto; padding: 46px 28px 40px; }
      .bp-empty-inner { width: 100%; max-width: 720px; margin: 0 auto; }
      .bp-empty h1 { max-width: 640px; margin: 10px 0 8px; font-size: clamp(26px, 3.4vw, 40px); font-weight: 700; letter-spacing: -.04em; line-height: 1.13; }
      .bp-empty p { max-width: 560px; margin: 0; color: var(--bp-muted); font-size: 13px; line-height: 1.7; }
      .bp-empty-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
      .bp-empty-actions .bp-btn { height: 32px; padding: 0 12px; font-size: 12px; }
      .bp-empty-actions .bp-btn[data-primary="true"] { color: #fff; background: var(--bp-accent); border-color: var(--bp-accent); }
      .bp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 30px; }
      .bp-grid-card { padding: 11px; background: var(--bp-card); border: 1px solid var(--bp-border); border-radius: 9px; }
      .bp-grid-card b { display: block; margin: 6px 0 3px; font-size: 12px; }
      .bp-grid-card span { color: var(--bp-muted); font-size: 10px; line-height: 1.5; }
      .bp-grid-icon { color: var(--bp-accent); font-size: 14px; }
      @keyframes bp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      @keyframes bp-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .bp-skeleton-line, .bp-skeleton-dot { animation: none; } }
      @media (max-width: 820px) {
        .bp-workspace { display: none; }
        .bp-canvas-frs { display: none; }
        .bp-panel { width: min(296px, calc(100% - 16px)); }
      }
`;

    function projectName(cwd) {
      if (!cwd) return "未打开项目";
      return cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
    }

    function openReviewCount(data) {
      return data?.status?.docs?.reviews?.open ?? data?.reviews?.comments?.length ?? 0;
    }

    function stageState(key, data) {
      const status = data?.status;
      const features = status?.docs?.features?.specs ?? 0;
      const kb = status?.docs?.kb?.files ?? 0;
      const reviews = openReviewCount(data);
      if (key === "baseline") {
        const stack = data?.baseline?.stack;
        const label = { "react-tailwind": "React + Tailwind", react: "React", vue2: "Vue 2.7", existing: "沿用项目现状" }[stack] || stack;
        return { label: stack ? `已确认 · ${label}` : "没确认", ready: Boolean(stack) };
      }
      if (key === "requirements") return { label: features ? `${features} 份 FRS` : "还没有 FRS", ready: features > 0 };
      if (key === "prototype") {
        const prototype = status?.prototype || {};
        if (!prototype.devScript) return { label: "没找到 dev 脚本", ready: false };
        if (prototype.installed === false) return { label: "依赖未安装", ready: false };
        if (prototype.url) {
          let port = "";
          try {
            port = new URL(prototype.url).port;
          } catch {
            port = "";
          }
          return { label: port ? `运行中 · :${port}` : "运行中", ready: true };
        }
        return { label: prototype.dir && prototype.dir !== "." ? `${prototype.dir} · 未启动` : "未启动", ready: false };
      }
      if (key === "review") return { label: reviews ? `${reviews} 条待处理` : "没有待处理批注", ready: reviews === 0 };
      if (key === "content") return { label: kb ? `${kb} 页内容` : "还没有内容", ready: kb > 0 };
      if (key === "publish") return { label: data?.publish?.configured ? "已配置目标" : "未配置目标", ready: Boolean(data?.publish?.configured) };
      return { label: "", ready: false };
    }

    function nextAction(data) {
      const status = data?.status;
      if (!data?.baseline?.stack) return { stage: "baseline", label: "设置生产基线", detail: "先锁定技术栈和 UI 规范，后面的原型与评审才有可对齐的标准。" };
      if (!(status?.docs?.features?.specs > 0)) return { stage: "requirements", label: "创建第一份 FRS", detail: "把要做的功能写成可验收的需求件套，评审批注才能归档到具体功能。" };
      if (!status?.prototype?.devScript) return { stage: "prototype", label: "接入原型 dev server", detail: status?.prototype?.reason || "在工作区的应用目录 package.json 添加 dev 脚本，BuilderHarness 会启动真实原型并把它嵌进操作台。" };
      if (status?.prototype?.installed === false) return { stage: "prototype", label: "安装原型依赖", detail: status.prototype.reason || "先安装依赖，BuilderHarness 才能启动真实原型。" };
      if (openReviewCount(data) > 0) return { stage: "review", label: "处理待解决批注", detail: `${openReviewCount(data)} 条批注还没有关闭；在原型里点选元素，或者在右侧逐条处理。` };
      if (!(status?.docs?.kb?.files > 0)) return { stage: "content", label: "建立内容锁", detail: "把文档、截图和引用纳入 _lock.json，确认哪些内容已经随原型一起验收。" };
      if (!data?.publish?.configured) return { stage: "publish", label: "配置发布目的地", detail: "接上发布适配器，先跑 dry-run，确认新增页面和覆盖范围。" };
      return { stage: "publish", label: "流水线已就绪", detail: "基线、需求、原型、评审和内容都已齐备，可以运行发布 dry-run。" };
    }

    const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

    /**
     * Browsers refuse to frame a loopback alias that differs from the page host,
     * so the preview proxy is addressed with the host the cockpit is served from.
     */
    function withEmbed(url) {
      try {
        const parsed = new URL(url);
        if (LOOPBACK_HOSTS.has(parsed.hostname) && LOOPBACK_HOSTS.has(location.hostname)) {
          parsed.hostname = location.hostname;
        }
        parsed.searchParams.set(EMBED_QUERY, "1");
        return parsed.toString();
      } catch {
        return url;
      }
    }

    function readCockpitStage() {
      try {
        return localStorage.getItem("builderharness.cockpit.stage") || "prototype";
      } catch {
        return "prototype";
      }
    }

    function writeCockpitStage(stage) {
      try {
        localStorage.setItem("builderharness.cockpit.stage", stage);
      } catch {
        // Keep the in-memory stage when storage is unavailable.
      }
    }

    const COCKPIT_CWD_KEY = "builderharness.cockpit.cwd";

    function rememberCockpitCwd(cwd) {
      try {
        if (cwd && localStorage.getItem(COCKPIT_CWD_KEY) !== cwd) localStorage.setItem(COCKPIT_CWD_KEY, cwd);
      } catch {
        // Private mode or a blocked storage quota should not break the cockpit.
      }
    }

    function readRememberedCockpitCwd() {
      try {
        return localStorage.getItem(COCKPIT_CWD_KEY) || null;
      } catch {
        return null;
      }
    }

    /**
     * The cockpit must follow the session the user is looking at, not whichever
     * session changed last. `retainedBy.mainView` is DSH's own notion of the
     * visible conversation; while a global panel covers the main view it drops
     * to zero, so the last known cwd is kept as the fallback.
     */
    function selectCockpitCwd(sessions) {
      const rows = Object.values(sessions.byId).filter((row) => row && row.cwd && !row.parentId);
      const visible = rows.find((row) => (row.retainedBy?.mainView ?? 0) > 0);
      if (visible) {
        rememberCockpitCwd(visible.cwd);
        return visible.cwd;
      }
      const remembered = readRememberedCockpitCwd();
      if (remembered) return remembered;
      let best;
      for (const row of rows) if (!best || row.updatedAt > best.updatedAt) best = row;
      if (best) rememberCockpitCwd(best.cwd);
      return best?.cwd;
    }

    function CockpitIcon({ size = 16 } = {}) {
      return h(BeeIcon, { size });
    }

    function CockpitEmpty() {
      const items = [
        ["◈", "生产基线", "技术栈、UI 规范和项目上下文一次锁定。"],
        ["▤", "需求规格", "FRS、验收标准和功能点规则。"],
        ["▷", "真实原型", "直接运行 dev server，不再看截图猜交互。"],
        ["◎", "源码级评审", "点选原型元素，把批注锚到源码坐标。"],
        ["▥", "下游交付", "文档、引用、截图与录屏在门禁之后统一验收。"],
        ["↗", "发布 dry-run", "目的地适配器先演练，再真正发布。"],
      ];
      return h(
        "div",
        { className: "bp-empty" },
        h(
          "div",
          { className: "bp-empty-inner" },
          h("div", { className: "bp-kicker" }, "BuilderHarness · Prototype to production"),
          h("h1", null, "把你的 vibecoding 玩具", h("br"), "变成生产级产品应用"),
          h("p", null, "BuilderHarness 是 DSH 之上的产品构建 Harness：规格、同源真实原型与源码锚点评审在同一个环里完成；内容与发布是门禁之后的下游交付。"),
          h(
            "div",
            { className: "bp-empty-actions" },
            h("button", { className: "bp-btn", "data-primary": "true", onClick: () => bridge.pickProject().catch(() => {}) }, "导入开发项目"),
            h("button", { className: "bp-btn", onClick: () => bridge.startSession() }, "新建项目会话"),
            h("button", { className: "bp-btn", onClick: () => bridge.openChat() }, "回到对话"),
          ),
          h(
            "div",
            { className: "bp-grid" },
            items.map(([icon, title, text]) =>
              h("div", { className: "bp-grid-card", key: title }, h("span", { className: "bp-grid-icon" }, icon), h("b", null, title), h("span", null, text)),
            ),
          ),
        ),
      );
    }

    function CockpitRail({ data, stage, goStage, openCount, panel, onPanel, onHelp, onChat, helpRef }) {
      return h(
        "nav",
        { className: "bp-rail", "aria-label": "生产流水线" },
        STAGES.map((item) => {
          const state = stageState(item.key, data);
          return h(
            "button",
            {
              key: item.key,
              className: "bp-rail-item",
              "data-active": String(item.key === stage),
              "data-ready": String(state.ready),
              title: `${item.title} · ${state.label}`,
              "aria-label": `${item.title}：${state.label}`,
              onClick: () => goStage(item.key),
            },
            h(Icon, { name: item.key, size: 17 }),
            h("span", { className: "bp-rail-dot" }),
          );
        }),
        h("span", { className: "bp-rail-spacer" }),
        h(
          "button",
          { className: "bp-icon-btn", "data-on": String(panel), onClick: onPanel, title: `待处理批注 ${openCount}`, "aria-label": `待处理批注 ${openCount}` },
          h(Icon, { name: "comments", size: 16 }),
          openCount ? h("span", { className: "bp-icon-badge" }, openCount > 9 ? "9+" : String(openCount)) : null,
        ),
        h("button", { className: "bp-icon-btn", ref: helpRef, onClick: onHelp, title: "帮助", "aria-label": "帮助" }, h(Icon, { name: "help", size: 16 })),
        h("button", { className: "bp-icon-btn", onClick: onChat, title: "回到对话", "aria-label": "回到对话" }, h(Icon, { name: "chat", size: 16 })),
      );
    }

    function CockpitPanel({ open, onClose, cwd, data, state, reload, goStage }) {
      const [output, setOutput] = React.useState("");
      const reviews = data?.reviews?.comments || [];
      const next = nextAction(data);
      const closeRef = React.useRef(null);
      React.useEffect(() => {
        if (open) closeRef.current?.focus();
      }, [open]);
      if (!open) return null;
      const resolve = async (id) => {
        setOutput("处理中…");
        try {
          await request("/review/resolve", { root: cwd, id });
          setOutput("");
          await reload();
        } catch (error) {
          setOutput(error instanceof Error ? error.message : String(error));
        }
      };
      return h(
        "aside",
        { className: "bp-panel", role: "dialog", "aria-label": "BuilderHarness 面板" },
        h(
          "div",
          { className: "bp-panel-head" },
          h("strong", null, "操作"),
          h("button", { className: "bp-icon-btn", ref: closeRef, onClick: onClose, "aria-label": "关闭面板", title: "关闭" }, h(Icon, { name: "close", size: 14 })),
        ),
        h(
          "section",
          { className: "bp-panel-block" },
          h("div", { className: "bp-panel-label" }, "下一步"),
          h("div", { className: "bp-next" },
            h("div", { className: "bp-next-title" }, next.label),
            h("div", { className: "bp-next-detail" }, next.detail),
            h("button", { className: "bp-btn bp-btn-primary", onClick: () => { goStage(next.stage); onClose(); } }, "去处理"),
          ),
        ),
        h(
          "section",
          { className: "bp-panel-block" },
          h("div", { className: "bp-panel-label" }, `待处理批注 · ${reviews.length}`),
          reviews.length
            ? reviews.slice(0, 8).map((review) =>
                h(
                  "div",
                  { className: "bp-panel-item", key: review.id },
                  h("div", { className: "bp-review-body" }, review.body),
                  h("div", { className: "bp-review-meta" }, [review.frs, review.route, review.author].filter(Boolean).join(" · ")),
                  h("button", { className: "bp-btn", onClick: () => resolve(review.id) }, "标记解决"),
                ),
              )
            : h("div", { className: "bp-panel-empty" }, "还没有批注。原型里点选元素就能留一条。"),
          output ? h("div", { className: "bp-error" }, output) : null,
        ),
      );
    }

    function usePrototypeRunner(cwd, state, reload, { autoStart = true } = {}) {
      const status = state.data?.status?.prototype;
      const found = status?.found ?? Boolean(status?.devScript);
      const installed = status?.installed !== false;
      const ready = Boolean(status?.devScript) && installed;
      const [url, setUrl] = React.useState("");
      const [error, setError] = React.useState("");
      const [starting, setStarting] = React.useState(false);
      const [installing, setInstalling] = React.useState(false);
      const [attempted, setAttempted] = React.useState(false);

      React.useEffect(() => {
        if (status?.url) setUrl(status.url);
      }, [status?.url, cwd]);

      React.useEffect(() => {
        setAttempted(false);
        setError("");
      }, [cwd]);

      const start = React.useCallback(async () => {
        if (!cwd) return;
        setStarting(true);
        setError("");
        try {
          const result = await request("/prototype/start", { root: cwd });
          setUrl(result.url);
          await reload();
          return result;
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason));
          return null;
        } finally {
          setStarting(false);
        }
      }, [cwd, reload]);

      const install = React.useCallback(async () => {
        if (!cwd || installing) return null;
        setInstalling(true);
        setError("");
        try {
          await request("/prototype/install", { root: cwd });
          await reload();
          return await start();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason));
          return null;
        } finally {
          setInstalling(false);
        }
      }, [cwd, installing, reload, start]);

      React.useEffect(() => {
        if (!autoStart || !cwd || !ready || url || starting || installing || attempted) return;
        setAttempted(true);
        start();
      }, [attempted, autoStart, cwd, installing, ready, start, starting, url]);

      React.useEffect(() => {
        const restart = () => {
          if (!cwd) return;
          if (!installed) install();
          else start();
        };
        window.addEventListener("builderharness:restart-prototype", restart);
        return () => window.removeEventListener("builderharness:restart-prototype", restart);
      }, [cwd, install, installed, start]);

      return { status, found, installed, ready, url, setUrl, error, setError, starting, installing, start, install };
    }

    function PrototypeFailure({ error, found, installing, onRetry, onInstall, onSwitch }) {
      const [open, setOpen] = React.useState(false);
      return h(
        "div",
        { className: "bp-preview-empty" },
        h("strong", null, "原型没能启动"),
        h("span", null, "先看下面的原因；修好之后点「重试」，不用离开这个页面。"),
        h("pre", { className: "bp-error-brief" }, error),
        h(
          "div",
          { className: "bp-preview-empty-actions" },
          h("button", { className: "bp-btn", "data-primary": "true", onClick: onRetry }, "重试"),
          found ? h("button", { className: "bp-btn", disabled: installing, onClick: onInstall }, installing ? "正在安装依赖…" : "安装依赖并启动") : null,
          h("button", { className: "bp-btn", onClick: onSwitch }, "切换工作区"),
          h("button", { className: "bp-btn", onClick: () => setOpen((value) => !value) }, open ? "收起日志" : "查看日志"),
        ),
        open ? h("pre", { className: "bp-log" }, error) : null,
      );
    }

    function PrototypeSkeleton({ label, detail }) {
      return h(
        "div",
        { className: "bp-skeleton", "aria-busy": "true" },
        h("div", { className: "bp-skeleton-bar" }, h("span", { className: "bp-skeleton-dot" }), label),
        h("div", { className: "bp-skeleton-canvas" },
          h("div", { className: "bp-skeleton-line", style: { width: "42%" } }),
          h("div", { className: "bp-skeleton-line", style: { width: "64%" } }),
          h("div", { className: "bp-skeleton-line", style: { width: "52%" } }),
        ),
        detail ? h("p", { className: "bp-skeleton-detail" }, detail) : null,
      );
    }

    function PrototypePanel({ cwd, state, reload, stage }) {
      const runner = usePrototypeRunner(cwd, state, reload);
      const { status, found, installed, ready, url, error, starting, installing, start, install } = runner;
      const [width, setWidth] = React.useState("100%");
      const [nonce, setNonce] = React.useState(0);
      const [loaded, setLoaded] = React.useState(false);
      const [slow, setSlow] = React.useState(false);
      const [embed, setEmbed] = React.useState(null);
      const frameRef = React.useRef(null);

      React.useEffect(() => {
        setEmbed(null);
        setLoaded(false);
        setSlow(false);
      }, [cwd, url, nonce]);

      React.useEffect(() => {
        if (loaded || !url) return undefined;
        const timer = setTimeout(() => setSlow(true), 12_000);
        return () => clearTimeout(timer);
      }, [loaded, url, nonce]);

      React.useEffect(() => {
        const onMessage = (event) => {
          const frame = frameRef.current;
          if (!frame || event.source !== frame.contentWindow) return;
          const data = event.data;
          if (!data || data.channel !== REVIEW_CHANNEL || data.type !== "state") return;
          setEmbed(data);
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
      }, []);

      // A comment added inside the prototype only reaches the cockpit through the
      // bridge; refetch once it lands so the badge and inspector stop disagreeing.
      const lastOpen = React.useRef(null);
      React.useEffect(() => {
        const value = embed?.open;
        if (typeof value !== "number") return undefined;
        if (lastOpen.current === null) {
          lastOpen.current = value;
          return undefined;
        }
        if (lastOpen.current === value) return undefined;
        lastOpen.current = value;
        const timer = setTimeout(() => reload().catch(() => {}), 350);
        return () => clearTimeout(timer);
      }, [embed?.open, reload]);

      const send = (command, value) => {
        frameRef.current?.contentWindow?.postMessage({ channel: REVIEW_CHANNEL, type: "command", command, value }, "*");
      };

      const refresh = () => {
        setNonce((value) => value + 1);
        setLoaded(false);
        setSlow(false);
        setEmbed(null);
      };

      const frs = embed?.frs?.length
        ? embed.frs
        : (state.data?.status?.docs?.features?.keys || []).slice(0, 3).map((key) => ({ key, title: key }));
      const open = embed?.open ?? openReviewCount(state.data);
      const routeOpen = embed?.routeOpen ?? open;
      const bridgeReady = Boolean(embed);

      if (!ready) {
        const reason = status?.reason || "在工作区没有找到带 dev 脚本的 package.json。";
        const scanned = status?.scanned || [];
        return h(
          "div",
          { className: "bp-preview-wrap" },
          error
            ? h(PrototypeFailure, { error, found, installing, onRetry: start, onInstall: install, onSwitch: () => bridge.pickProject().catch(() => {}) })
            : h(
                "div",
                { className: "bp-preview-empty" },
                h("strong", null, found ? "原型依赖还没安装" : "这个工作区还没有可运行的原型"),
                h("span", null, reason),
                found
                  ? h(
                      "span",
                      { className: "bp-preview-meta" },
                      `应用目录 ${status.dir} · ${status.packageManager || "npm"} · dev = ${status.devScript}`,
                    )
                  : null,
                h(
                  "div",
                  { className: "bp-preview-empty-actions" },
                  found
                    ? h("button", { className: "bp-btn", "data-primary": "true", disabled: installing, onClick: install }, installing ? "正在安装依赖…" : "安装依赖并启动")
                    : null,
                  h("button", { className: "bp-btn", disabled: !cwd, onClick: () => reload().catch(() => {}) }, "重新检测"),
                  h("button", { className: "bp-btn", onClick: () => bridge.pickProject().catch(() => {}) }, "切换工作区"),
                  found ? null : h("button", { className: "bp-btn", onClick: () => bridge.openBrowser("https://vite.dev/guide/") }, "Vite 说明"),
                ),
                scanned.length ? h("span", { className: "bp-preview-scanned" }, `已检查：${scanned.join("、")}`) : null,
              ),
        );
      }

      return h(
        "div",
        { className: "bp-preview-wrap" },
        h(
          "div",
          { className: "bp-canvas-bar" },
          h(
            "div",
            { className: "bp-canvas-url" },
            h("span", { className: "bp-live", "data-off": String(!url) }),
            h("code", { title: url || "" }, url ? url.replace(/^https?:\/\//, "") : starting || installing ? "正在准备原型…" : "等待原型服务"),
            embed?.route ? h("span", { className: "bp-route" }, embed.route) : null,
          ),
          h(
            "div",
            { className: "bp-canvas-frs" },
            frs.length ? h("span", { className: "bp-tag", title: frs.map((item) => item.key).join(" · ") }, frs[0].key) : null,
            embed && !embed.persistent ? h("span", { className: "bp-warn", title: "评审数据没有落盘" }, "⚠") : null,
          ),
          h(
            "div",
            { className: "bp-canvas-actions" },
            h(
              "button",
              { className: "bp-icon-btn", "data-on": String(Boolean(embed?.commentMode)), disabled: !bridgeReady, onClick: () => send("comment-mode", !embed?.commentMode), title: embed?.commentMode ? "退出点选" : "点选元素留批注", "aria-label": "评论模式" },
              h(Icon, { name: "review", size: 15 }),
            ),
            h("button", { className: "bp-icon-btn", disabled: !bridgeReady, onClick: () => send("toggle-drawer"), title: `评论抽屉${routeOpen ? ` · 本页 ${routeOpen}` : ""}`, "aria-label": "评论抽屉" }, h(Icon, { name: "panel", size: 15 })),
            h("button", { className: "bp-icon-btn", disabled: !bridgeReady, onClick: () => send("open-studio"), title: "内容检查台", "aria-label": "内容检查台" }, h(Icon, { name: "sparkles", size: 15 })),
            h(
              "button",
              {
                className: "bp-icon-btn",
                onClick: () => setWidth(width === "100%" ? "768px" : width === "768px" ? "390px" : "100%"),
                title: width === "100%" ? "桌面视图" : width === "768px" ? "平板视图" : "手机视图",
                "aria-label": "切换预览宽度",
              },
              h(Icon, { name: width === "100%" ? "monitor" : width === "768px" ? "tablet" : "phone", size: 15 }),
            ),
            h("button", { className: "bp-icon-btn", onClick: refresh, disabled: !url, title: "刷新原型", "aria-label": "刷新原型" }, h(Icon, { name: "refresh", size: 15 })),
            h("button", { className: "bp-icon-btn", onClick: () => bridge.openBrowser(url), disabled: !url, title: "在浏览器打开", "aria-label": "在浏览器打开" }, h(Icon, { name: "external", size: 15 })),
          ),
        ),
        slow && !loaded
          ? h(
              "div",
              { className: "bp-banner" },
              h("span", null, "原型在 12 秒内没有加载完成，可能是 dev server 还在编译。"),
              h("button", { className: "bp-btn", onClick: () => bridge.openBrowser(url) }, "在浏览器打开"),
              h("button", { className: "bp-btn", onClick: start }, "重启原型"),
            )
          : null,
        h(
          "div",
          { className: "bp-preview-stage" },
          error
            ? h(PrototypeFailure, { error, found, installing, onRetry: start, onInstall: install, onSwitch: () => bridge.pickProject().catch(() => {}) })
            : url
              ? h(
                  "div",
                  { className: "bp-preview-frame", style: { maxWidth: width === "100%" ? "100%" : width } },
                  !loaded ? h(PrototypeSkeleton, { label: "正在加载原型…", detail: "首次启动要等依赖预构建完成。" }) : null,
                  h("iframe", {
                    key: `${url}-${nonce}`,
                    ref: frameRef,
                    src: withEmbed(url),
                    title: "BuilderHarness prototype",
                    allow: "clipboard-read; clipboard-write",
                    onLoad: () => setLoaded(true),
                    style: { visibility: loaded ? "visible" : "hidden", position: loaded ? "relative" : "absolute", inset: 0 },
                  }),
                )
              : h(PrototypeSkeleton, {
                  label: installing ? "正在安装依赖…" : starting ? "正在启动 dev server…" : "正在准备原型…",
                  detail: installing ? "第一次安装可能要几分钟，期间可以切到其他阶段。" : "启动完成后会自动载入页面。",
                }),
        ),
      );
    }

    function StartStep({ index, title, description, state, children }) {
      return h(
        "section",
        { className: "bp-step", "data-done": String(state === "done"), "data-active": String(state === "active") },
        h("div", { className: "bp-step-index" }, state === "done" ? "✓" : String(index)),
        h(
          "div",
          { className: "bp-step-body" },
          h("div", { className: "bp-step-title" }, title),
          h("p", { className: "bp-step-desc" }, description),
          h("div", { className: "bp-step-actions" }, children),
        ),
      );
    }

    function StartFlow({ cwd, data, state, reload, goStage, onSkip }) {
      const baseline = data?.baseline || {};
      const detected = baseline.detected || {};
      const features = data?.status?.docs?.features || { specs: 0 };
      const runner = usePrototypeRunner(cwd, state, reload, { autoStart: false });
      const [title, setTitle] = React.useState("");
      const [busy, setBusy] = React.useState("");
      const [message, setMessage] = React.useState("");

      const baselineDone = Boolean(baseline.stack);
      const requirementsDone = (features.specs || 0) > 0;
      const prototypeDone = Boolean(runner.url);
      const firstOpen = !baselineDone ? 1 : !requirementsDone ? 2 : 3;
      const [view, setView] = React.useState(firstOpen);
      React.useEffect(() => {
        setView((current) => (current < firstOpen ? firstOpen : current));
      }, [firstOpen]);

      const status = runner.status || {};
      const adopt = async () => {
        setBusy("baseline");
        setMessage("");
        try {
          await request("/baseline", { root: cwd, stack: detected.stack || "existing", uiPreset: "builderharness" });
          await reload();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy("");
        }
      };
      const create = async () => {
        if (!title.trim()) return;
        setBusy("requirements");
        setMessage("");
        try {
          await request("/requirements/create", { root: cwd, title });
          setTitle("");
          await reload();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy("");
        }
      };

      const steps = [
        { index: 1, key: "baseline", label: "技术栈", done: baselineDone },
        { index: 2, key: "requirements", label: "需求", done: requirementsDone },
        { index: 3, key: "prototype", label: "原型", done: prototypeDone },
      ];
      const current = steps.find((item) => item.index === view) || steps[0];

      let body;
      if (current.key === "baseline") {
        body = [
          h("p", { className: "bp-start-desc" }, detected.stack
            ? `检测到 ${detected.label}${detected.typescript ? " · TypeScript" : ""}${detected.bundler ? ` · ${detected.bundler}` : ""}。确认后所有页面按同一套基线验收。`
            : "没有识别出技术栈。手动选一下即可，之后可以改。"),
          detected.evidence?.length ? h("div", { className: "bp-start-evidence" }, detected.evidence.slice(0, 3).join("  ·  ")) : null,
          h("div", { className: "bp-start-actions" },
            detected.stack
              ? h("button", { className: "bp-btn bp-btn-primary", disabled: busy === "baseline", onClick: adopt }, busy === "baseline" ? "保存中…" : "采用检测结果")
              : null,
            h("button", { className: "bp-btn", onClick: () => goStage("baseline") }, detected.stack ? "手动选择" : "选择技术栈"),
          ),
        ];
      } else if (current.key === "requirements") {
        body = [
          h("p", { className: "bp-start-desc" }, requirementsDone ? `已有 ${features.specs} 份需求件套。` : "给要做的功能起个名字，BuilderHarness 会生成需求、流程和验收模板。"),
          requirementsDone
            ? h("div", { className: "bp-start-actions" }, h("button", { className: "bp-btn", onClick: () => goStage("requirements") }, "看需求"))
            : h("div", { className: "bp-start-actions" },
                h("input", {
                  className: "bp-input",
                  placeholder: "例如：登录改版",
                  value: title,
                  onChange: (event) => setTitle(event.target.value),
                  onKeyDown: (event) => { if (event.key === "Enter") create(); },
                }),
                h("button", { className: "bp-btn bp-btn-primary", disabled: !title.trim() || busy === "requirements", onClick: create }, busy === "requirements" ? "创建中…" : "创建"),
              ),
        ];
      } else {
        const hint = !status.found
          ? "这个工作区没有可运行的前端应用。换一个工作区，或在应用目录加一个 dev 脚本。"
          : status.installed === false
            ? `${status.packageManager || "npm"} 依赖还没安装，BuilderHarness 可以直接装好并启动。`
            : `将运行 ${status.packageManager || "npm"} run dev（${status.devScript}）${status.dir && status.dir !== "." ? `，应用目录 ${status.dir}` : ""}。`;
        body = [
          h("p", { className: "bp-start-desc" }, hint),
          h("div", { className: "bp-start-actions" },
            status.found && status.installed === false
              ? h("button", { className: "bp-btn bp-btn-primary", disabled: runner.installing || runner.starting, onClick: runner.install }, runner.installing ? "正在安装依赖…" : runner.starting ? "正在启动…" : "安装依赖并启动")
              : null,
            status.found && status.installed !== false
              ? h("button", { className: "bp-btn bp-btn-primary", disabled: runner.starting, onClick: runner.start }, runner.starting ? "正在启动…" : "启动原型")
              : null,
            !status.found ? h("button", { className: "bp-btn", onClick: () => bridge.pickProject().catch(() => {}) }, "切换工作区") : null,
            h("button", { className: "bp-btn", onClick: () => goStage("prototype") }, "看详细信息"),
          ),
        ];
      }

      return h(
        "div",
        { className: "bp-start-wrap" },
        h(
          "section",
          { className: "bp-start-card" },
          h(
            "header",
            { className: "bp-start-head" },
            h("div", null,
              h("div", { className: "bp-kicker" }, "开始"),
              h("h2", null, "把原型跑起来"),
            ),
            h("button", { className: "bp-icon-btn", onClick: onSkip, title: "跳过引导", "aria-label": "跳过引导" }, h(Icon, { name: "close", size: 14 })),
          ),
          h(
            "div",
            { className: "bp-start-steps" },
            steps.map((item) =>
              h("button", {
                key: item.key,
                className: "bp-start-step",
                "data-done": String(item.done),
                "data-active": String(item.index === view),
                onClick: () => setView(item.index),
              }, h("span", { className: "bp-start-step-dot" }, item.done ? "✓" : String(item.index)), item.label),
            ),
          ),
          h("div", { className: "bp-start-body" }, body),
          runner.error ? h(PrototypeFailure, { error: runner.error, found: runner.found, installing: runner.installing, onRetry: runner.start, onInstall: runner.install, onSwitch: () => bridge.pickProject().catch(() => {}) }) : null,
          message ? h("div", { className: "bp-error" }, message) : null,
          h(
            "footer",
            { className: "bp-start-foot" },
            h("span", null, "引导只在原型未就绪时出现"),
            h("button", { className: "bp-link", onClick: onSkip }, "跳过"),
          ),
        ),
      );
    }

    const START_SKIP_PREFIX = "builderharness.start.skip.";

    function readStartSkip(cwd) {
      try {
        return Boolean(cwd) && localStorage.getItem(`${START_SKIP_PREFIX}${cwd}`) === "1";
      } catch {
        return false;
      }
    }

    function writeStartSkip(cwd, value) {
      try {
        if (!cwd) return;
        const key = `${START_SKIP_PREFIX}${cwd}`;
        if (value) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
      } catch {
        // Storage can be unavailable; the guide simply reappears.
      }
    }

    const GLOSSARY = [
      ["◈", "生产基线", "先约定用哪套技术栈和 UI 规范，后面所有页面按同一标准验收。"],
      ["▤", "需求", "把功能写成可验收的 FRS，批注才能归到具体功能。"],
      ["▷", "原型", "运行中的真实页面，不是截图；改完立刻能看到。"],
      ["◎", "评审", "在原型上点选元素留批注，批注自带源码坐标。"],
      ["▥", "内容", "把原型变成手册和通知，内容锁记录哪些已经验收。"],
      ["↗", "发布", "先 dry-run 看清会改哪些内容，再发到目标端。"],
    ];

    function CockpitHelp({ cwd, onClose, onShowGuide }) {
      const closeRef = React.useRef(null);
      React.useEffect(() => {
        closeRef.current?.focus();
      }, []);
      return h(
        "div",
        { className: "bp-help", role: "dialog", "aria-modal": "false", "aria-label": "BuilderHarness 帮助" },
        h(
          "div",
          { className: "bp-help-head" },
          h("strong", null, "这是什么？"),
          h("button", { className: "bp-btn", ref: closeRef, onClick: onClose, "aria-label": "关闭帮助" }, "关闭"),
        ),
        h(
          "div",
          { className: "bp-help-list" },
          GLOSSARY.map(([icon, title, text]) =>
            h("div", { className: "bp-help-item", key: title }, h("span", { className: "bp-help-icon" }, icon), h("span", null, h("b", null, title), h("span", null, text))),
          ),
        ),
        h("div", { className: "bp-help-title" }, "快捷键"),
        h(
          "div",
          { className: "bp-help-keys" },
          h("div", null, h("kbd", null, "⌘/Ctrl"), h("span", null, "Enter"), h("span", null, "启动或重启原型")),
          h("div", null, h("kbd", null, "Esc"), h("span", null, "关闭帮助或评论抽屉")),
        ),
        h("button", { className: "bp-btn", onClick: onShowGuide }, "重新显示新手引导"),
      );
    }

    function Cockpit({ cwd }) {
      const [state, reload] = useBeeState(cwd);
      const [stage, setStageState] = React.useState(readCockpitStage);
      const [help, setHelp] = React.useState(false);
      const [panel, setPanel] = React.useState(false);
      const [skipStart, setSkipStart] = React.useState(() => readStartSkip(cwd));
      const [forceGuide, setForceGuide] = React.useState(false);
      const helpButton = React.useRef(null);
      const setStage = (key) => {
        setStageState(key);
        writeCockpitStage(key);
      };
      const data = state.data || {};
      const stageMeta = STAGES.find((item) => item.key === stage) || STAGES[2];
      const Component = stageComponents[stage] || PrototypeStage;
      const preview = stage === "prototype" || stage === "review";
      const prototype = data.status?.prototype;
      const prototypeReady = Boolean(prototype?.devScript) && prototype?.installed !== false && Boolean(prototype?.url);
      const showStart = preview && !skipStart && (forceGuide || !prototypeReady);

      React.useEffect(() => {
        setSkipStart(readStartSkip(cwd));
        setForceGuide(false);
        setHelp(false);
        setPanel(false);
      }, [cwd]);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape") {
            if (help) {
              setHelp(false);
              helpButton.current?.focus();
              return;
            }
            if (panel) setPanel(false);
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            const tag = String(document.activeElement?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;
            event.preventDefault();
            window.dispatchEvent(new Event("builderharness:restart-prototype"));
          }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [help, panel]);

      const openCount = openReviewCount(data);
      const next = nextAction(data);

      return h(
        "div",
        { className: "bp-cockpit", "data-builderharness-cockpit": stage },
        h("style", null, cockpitCss),
        !cwd
          ? h(CockpitEmpty)
          : h(
              "div",
              { className: "bp-shell" },
              h(CockpitRail, {
                data,
                stage,
                goStage: setStage,
                openCount,
                panel,
                onPanel: () => setPanel((value) => !value),
                onHelp: () => setHelp((value) => !value),
                onChat: () => bridge.openChat(),
                helpRef: helpButton,
              }),
              h(
                "main",
                { className: "bp-stage-area" },
                state.loading && !state.data
                  ? h(PrototypeSkeleton, { label: "正在读取工作区…" })
                  : showStart
                    ? h(StartFlow, {
                        cwd,
                        data,
                        state,
                        reload,
                        goStage: setStage,
                        onSkip: () => {
                          writeStartSkip(cwd, true);
                          setSkipStart(true);
                          setForceGuide(false);
                        },
                      })
                    : preview
                      ? h(PrototypePanel, { cwd, state, reload, stage })
                      : h("div", { className: "bp-canvas-body" }, h(Component, { stage: stageMeta, cwd, state, reload, embedded: true })),
                preview && !showStart
                  ? null
                  : h(
                      "div",
                      { className: "bp-floatbar" },
                      h("span", { className: "bp-workspace", title: cwd }, projectName(cwd)),
                      h("button", { className: "bp-icon-btn", onClick: reload, disabled: state.loading, title: "刷新", "aria-label": "刷新" }, h(Icon, { name: "refresh", size: 15 })),
                    ),
                showStart || next.stage === stage
                  ? null
                  : h("button", { className: "bp-next-chip", onClick: () => setPanel(true), title: next.detail }, h("span", null, "下一步"), next.label, h(Icon, { name: "chevron", size: 13 })),
              ),
              h(CockpitPanel, { open: panel, onClose: () => setPanel(false), cwd, data, state, reload, goStage: setStage }),
              help
                ? h(CockpitHelp, {
                    cwd,
                    onClose: () => { setHelp(false); helpButton.current?.focus(); },
                    onShowGuide: () => { writeStartSkip(cwd, false); setSkipStart(false); setForceGuide(true); setStage("prototype"); setHelp(false); },
                  })
                : null,
            ),
      );
    }

    function CockpitRoot(props) {
      if (typeof props.useSessions !== "function") return h(Cockpit, { cwd: undefined });
      return h(CockpitWithSessions, props);
    }

    function CockpitWithSessions({ useSessions }) {
      const cwd = useSessions(selectCockpitCwd);
      return h(Cockpit, { cwd });
    }

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
      bridge.openChat = () => ctx.layout.selectPanel(null);
      bridge.openWorkbench = () => ctx.layout.selectPanel(COCKPIT_PANEL_ID);
      bridge.startSession = () => ctx.uiWorkspace.startSession();
      bridge.pickProject = async () => {
        const root = await ctx.uiWorkspace.pickDirectory();
        if (!root) return;
        const workspace = await ctx.workspaces.create({ path: root });
        await ctx.uiWorkspace.openWorkspace(workspace.workspaceId);
        rememberCockpitCwd(root);
        ctx.layout.selectPanel(COCKPIT_PANEL_ID);
      };

      window.__builderHarnessDesktop = {
        async openProject(root) {
          const workspace = await ctx.workspaces.create({ path: root });
          await ctx.uiWorkspace.openWorkspace(workspace.workspaceId);
          rememberCockpitCwd(root);
          ctx.layout.selectPanel(COCKPIT_PANEL_ID);
          return { workspaceId: workspace.workspaceId, path: root };
        },
        openWorkbench() {
          ctx.layout.selectPanel(COCKPIT_PANEL_ID);
        },
        openChat() {
          ctx.layout.selectPanel(null);
        },
      };

      ctx.effect(
        () => ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: COCKPIT_PANEL_ID }, CockpitRoot)),
        "builderharness: cockpit",
      );
      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.panellist", () =>
            ctx.slots.register({ name: "sidebar.panellist", id: COCKPIT_PANEL_ID, order: -10, label: () => "BuilderHarness" }, CockpitIcon),
          ),
        "builderharness: cockpit icon",
      );
      const openCockpit = (attempt = 0) => {
        try {
          ctx.layout.selectPanel(COCKPIT_PANEL_ID);
        } catch (error) {
          if (attempt < 20) setTimeout(() => openCockpit(attempt + 1), 150);
          else console.warn("[builderharness] could not open cockpit", error);
        }
      };
      setTimeout(() => openCockpit(), 0);

      ctx.effect(
        () =>
          ctx.shortcuts.register({
            id: "builderharness.open",
            label: () => "BuilderHarness",
            aliases: ["builder harness", "bee press"],
            defaults: {},
            regions: ["page", "editable", "terminal"],
            modals: [],
            resolve: ({ target }) => {
              const sessionTarget = ctx.sidebarRight.commandTarget(target);
              if (!sessionTarget) return { status: "blocked", reason: "Open a session first" };
              return { status: "handled", run: () => ctx.sidebarRight.openTabFromTarget("builderharness-baseline", sessionTarget) };
            },
          }),
        "builderharness: shortcut",
      );

      ctx.effect(
        () => ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({ name: "sidebar.brand.mark", priority: -100 }, BeeBrandMark)),
        "builderharness: brand mark",
      );
      ctx.effect(
        () => ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({ name: "sidebar.brand.name", priority: -100 }, BeeBrandName)),
        "builderharness: brand name",
      );

      for (const stage of STAGES) {
        const id = `${ID}/${stage.key}`;
        const kind = `builderharness-${stage.key}`;
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
          `builderharness: tab ${stage.key}`,
        );
        ctx.effect(
          () => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: id }, makeStageBody(stage))),
          `builderharness: body ${stage.key}`,
        );
        ctx.effect(
          () => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: id }, BeeTitle)),
          `builderharness: title ${stage.key}`,
        );
      }
    }

    return {
      id: ID,
      name: "builderharness-client",
      inject: ["slots", "layout", "sidebarRightTabs", "sidebarRight", "shortcuts", "uiWorkspace", "workspaces"],
      apply(ctx) {
        try {
          install(ctx);
        } catch (error) {
          console.error("[builderharness] client apply failed", error);
          throw error;
        }
      },
    };
  },
});
