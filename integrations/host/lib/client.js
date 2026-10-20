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

    const COCKPIT_PANEL_ID = "beepress-workbench";
    const REVIEW_CHANNEL = "beepress-review";
    const EMBED_QUERY = "beepress_embed";

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

    function StageFrame({ stage, cwd, state, reload, embedded = false, children }) {
      const body = !cwd
        ? h("div", { style: styles.loading }, "打开一个 Session 后使用 Bee Press。")
        : state.error
          ? h("div", { style: styles.error }, state.error)
          : state.loading && !state.data
            ? h("div", { style: styles.loading }, "读取 Bee Press 工作区…")
            : children;
      if (embedded) return h("div", { style: styles.embeddedBody, "data-beepress-panel": stage.key }, body);
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
        body,
      );
    }

    function BaselineStage({ stage, cwd, state, reload, embedded }) {
      const [stack, setStack] = React.useState("existing");
      const [uiPreset, setUiPreset] = React.useState("bee-press");
      const [output, setOutput] = React.useState("");
      const detected = state.data?.baseline?.detected;
      React.useEffect(() => {
        if (state.data?.baseline) {
          setStack(state.data.baseline.stack || "existing");
          setUiPreset(state.data.baseline.uiPreset || "bee-press");
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
              h(Button, { primary: true, onClick: () => save(detected.stack, "bee-press") }, "采用检测结果"),
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
              h("option", { value: "bee-press" }, "Bee Press UI Spec"),
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
        --bp-accent: var(--dsh-accent-default, #0969da);
        --bp-success: var(--dsh-success-default, #1a7f37);
        --bp-warning: var(--dsh-warning-default, #9a6700);
        --bp-danger: var(--dsh-danger-default, #cf222e);
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        color: var(--dsh-text-primary, #1f2328);
        background: var(--dsh-surface-default, #ffffff);
        font: 13px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .bp-cockpit *, .bp-cockpit *::before, .bp-cockpit *::after { box-sizing: border-box; }
      .bp-top {
        display: flex;
        align-items: center;
        gap: 14px;
        flex: none;
        height: 50px;
        padding: 0 14px;
        border-bottom: 1px solid var(--dsh-border-default, #d8dee4);
        background: var(--dsh-surface-default, #ffffff);
      }
      .bp-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
      .bp-brand-mark {
        display: flex; align-items: center; justify-content: center;
        width: 29px; height: 29px; flex: none;
        color: var(--bp-accent);
        background: color-mix(in srgb, var(--bp-accent) 10%, transparent);
        border: 1px solid color-mix(in srgb, var(--bp-accent) 24%, transparent);
        border-radius: 8px;
      }
      .bp-brand-name { font-size: 13px; font-weight: 700; letter-spacing: -0.01em; }
      .bp-brand-sub { margin-top: 1px; color: var(--dsh-text-secondary, #656d76); font-size: 9px; font-weight: 650; letter-spacing: 0.11em; text-transform: uppercase; white-space: nowrap; }
      .bp-project { min-width: 0; padding-left: 14px; border-left: 1px solid var(--dsh-border-default, #d8dee4); }
      .bp-project-label { color: var(--dsh-text-secondary, #656d76); font-size: 9px; font-weight: 650; letter-spacing: 0.09em; text-transform: uppercase; }
      .bp-project-name { margin-top: 2px; font-size: 12px; font-weight: 600; white-space: nowrap; }
      .bp-project-path { display: block; max-width: 36vw; overflow: hidden; color: var(--dsh-text-secondary, #656d76); font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }
      .bp-top-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
      .bp-btn {
        display: inline-flex; align-items: center; gap: 5px;
        height: 27px; padding: 0 9px;
        color: var(--dsh-text-secondary, #656d76);
        background: transparent;
        border: 1px solid var(--dsh-border-default, #d8dee4);
        border-radius: 7px;
        font: 11px/1 ui-sans-serif, -apple-system, sans-serif;
        cursor: pointer;
        white-space: nowrap;
      }
      .bp-btn:hover:not(:disabled) { color: var(--dsh-text-primary, #1f2328); background: var(--dsh-surface-subtle, #f6f8fa); }
      .bp-btn[data-on="true"] { color: var(--bp-accent); border-color: color-mix(in srgb, var(--bp-accent) 42%, var(--dsh-border-default, #d8dee4)); background: color-mix(in srgb, var(--bp-accent) 8%, transparent); }
      .bp-btn:disabled { opacity: .45; cursor: not-allowed; }
      .bp-body { display: grid; grid-template-columns: 190px minmax(0, 1fr) 280px; flex: 1; min-height: 0; }
      .bp-rail { min-height: 0; overflow: auto; padding: 13px 9px; border-right: 1px solid var(--dsh-border-default, #d8dee4); background: var(--dsh-surface-subtle, #f6f8fa); }
      .bp-rail-label { padding: 0 8px 8px; color: var(--dsh-text-secondary, #656d76); font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
      .bp-stage {
        display: flex; align-items: flex-start; gap: 8px;
        width: 100%; padding: 8px; margin: 1px 0;
        color: var(--dsh-text-primary, #1f2328);
        text-align: left;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 8px;
        cursor: pointer;
      }
      .bp-stage:hover { background: color-mix(in srgb, var(--dsh-text-primary, #1f2328) 4%, transparent); }
      .bp-stage[data-active="true"] { background: var(--dsh-surface-default, #ffffff); border-color: var(--dsh-border-default, #d8dee4); box-shadow: 0 1px 2px rgba(0,0,0,.04); }
      .bp-stage-icon { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; color: var(--dsh-text-secondary, #656d76); background: color-mix(in srgb, var(--dsh-text-primary, #1f2328) 5%, transparent); border-radius: 6px; font-size: 11px; }
      .bp-stage[data-active="true"] .bp-stage-icon { color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 9%, transparent); }
      .bp-stage-title { font-size: 12px; font-weight: 600; line-height: 1.35; }
      .bp-stage-desc { margin-top: 2px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; line-height: 1.4; }
      .bp-stage-state { margin-top: 4px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; }
      .bp-dot { display: inline-block; width: 5px; height: 5px; margin-right: 4px; border-radius: 50%; background: currentColor; vertical-align: 1px; }
      .bp-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; background: var(--dsh-surface-default, #ffffff); }
      .bp-canvas { flex: 1; min-height: 0; overflow: auto; padding: 22px 24px 32px; }
      .bp-canvas > * { width: 100%; max-width: 860px; margin: 0 auto; }
      .bp-preview-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 12px 14px 14px; }
      .bp-preview-head { display: flex; align-items: center; gap: 10px; flex: none; min-height: 38px; padding: 5px 9px 5px 11px; border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 10px 10px 0 0; background: var(--dsh-surface-subtle, #f6f8fa); }
      .bp-preview-url { display: flex; align-items: center; gap: 7px; min-width: 0; color: var(--dsh-text-secondary, #656d76); font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .bp-preview-url code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bp-live { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--bp-success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--bp-success) 13%, transparent); }
      .bp-preview-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
      .bp-seg { display: inline-flex; overflow: hidden; border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 6px; }
      .bp-seg button { height: 24px; padding: 0 7px; color: var(--dsh-text-secondary, #656d76); background: var(--dsh-surface-default, #fff); border: 0; font: 10px/1 sans-serif; cursor: pointer; }
      .bp-seg button + button { border-left: 1px solid var(--dsh-border-default, #d8dee4); }
      .bp-seg button[data-on="true"] { color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 9%, var(--dsh-surface-default, #fff)); }
      .bp-review-strip { display: flex; align-items: center; gap: 8px; flex: none; min-height: 35px; padding: 4px 10px; border: 1px solid var(--dsh-border-default, #d8dee4); border-top: 0; background: var(--dsh-surface-default, #ffffff); overflow: hidden; }
      .bp-review-frs { display: flex; align-items: center; gap: 5px; min-width: 0; }
      .bp-review-label { color: var(--dsh-text-secondary, #656d76); font-size: 9px; font-weight: 700; letter-spacing: .08em; }
      .bp-tag { max-width: 160px; padding: 2px 6px; overflow: hidden; color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 8%, transparent); border: 1px solid color-mix(in srgb, var(--bp-accent) 20%, transparent); border-radius: 999px; font: 9px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }
      .bp-review-actions { display: flex; align-items: center; gap: 5px; margin-left: auto; }
      .bp-warn { display: inline-flex; align-items: center; gap: 4px; color: var(--bp-warning); font-size: 10px; white-space: nowrap; }
      .bp-count { padding: 2px 6px; color: var(--dsh-text-secondary, #656d76); background: var(--dsh-surface-subtle, #f6f8fa); border-radius: 999px; font-size: 10px; white-space: nowrap; }
      .bp-review-strip .bp-btn { height: 24px; padding: 0 7px; font-size: 10px; }
      .bp-preview-stage { display: flex; justify-content: center; flex: 1; min-height: 0; overflow: auto; padding: 0; background: var(--dsh-surface-subtle, #f6f8fa); border: 1px solid var(--dsh-border-default, #d8dee4); border-top: 0; border-radius: 0 0 10px 10px; }
      .bp-preview-frame { position: relative; width: 100%; height: 100%; min-height: 320px; background: #fff; transition: max-width .18s ease; }
      .bp-preview-frame iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
      .bp-preview-frame > .bp-preview-loading { position: absolute; inset: 0; min-height: 0; background: var(--dsh-surface-subtle, #f6f8fa); }
      .bp-preview-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 320px; padding: 28px; color: var(--dsh-text-secondary, #656d76); text-align: center; }
      .bp-preview-empty strong { color: var(--dsh-text-primary, #1f2328); font-size: 14px; }
      .bp-preview-empty span { max-width: 460px; line-height: 1.65; }
      .bp-preview-empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 4px; }
      .bp-preview-meta { padding: 4px 8px; color: var(--dsh-text-primary, #1f2328); background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; }
      .bp-preview-scanned { color: var(--dsh-text-secondary, #656d76); font-size: 9px; opacity: .8; }
      .bp-preview-loading { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 320px; color: var(--dsh-text-secondary, #656d76); font-size: 12px; }
      .bp-inspector { min-height: 0; overflow: auto; padding: 14px 13px 20px; border-left: 1px solid var(--dsh-border-default, #d8dee4); background: var(--dsh-surface-subtle, #f6f8fa); }
      .bp-inspector-block { margin-bottom: 16px; }
      .bp-inspector-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; color: var(--dsh-text-secondary, #656d76); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .bp-card { padding: 9px 10px; background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 8px; }
      .bp-card + .bp-card { margin-top: 6px; }
      .bp-pipeline-row { display: flex; align-items: center; gap: 7px; min-height: 27px; padding: 0 2px; font-size: 11px; }
      .bp-pipeline-row + .bp-pipeline-row { border-top: 1px solid color-mix(in srgb, var(--dsh-border-default, #d8dee4) 65%, transparent); }
      .bp-pipeline-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bp-pipeline-state { margin-left: auto; color: var(--dsh-text-secondary, #656d76); font-size: 10px; white-space: nowrap; }
      .bp-pipeline-row[data-ready="true"] .bp-pipeline-state { color: var(--bp-success); }
      .bp-next { padding: 10px; background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 8px; }
      .bp-next-label { color: var(--bp-accent); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .bp-next-title { margin-top: 4px; font-size: 12px; font-weight: 650; line-height: 1.45; }
      .bp-next-detail { margin-top: 3px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; line-height: 1.5; }
      .bp-next .bp-btn { margin-top: 8px; }
      .bp-review-item { padding: 8px 9px; }
      .bp-review-body { display: -webkit-box; overflow: hidden; font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
      .bp-review-meta { margin-top: 4px; color: var(--dsh-text-secondary, #656d76); font-size: 9px; line-height: 1.5; overflow-wrap: anywhere; }
      .bp-review-item .bp-btn { height: 22px; margin-top: 6px; padding: 0 7px; font-size: 9px; }
      .bp-capabilities { display: flex; flex-direction: column; gap: 6px; }
      .bp-capability { display: flex; align-items: flex-start; gap: 7px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; line-height: 1.5; }
      .bp-capability b { display: block; color: var(--dsh-text-primary, #1f2328); font-size: 11px; font-weight: 600; }
      .bp-capability-mark { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; margin-top: 1px; color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 8%, transparent); border-radius: 4px; font-size: 9px; }
      .bp-empty { flex: 1; min-height: 0; overflow: auto; padding: 46px 28px 40px; }
      .bp-empty-inner { width: 100%; max-width: 720px; margin: 0 auto; }
      .bp-kicker { color: var(--bp-accent); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .bp-empty h1 { max-width: 640px; margin: 10px 0 8px; font-size: clamp(26px, 3.4vw, 40px); font-weight: 700; letter-spacing: -.04em; line-height: 1.13; }
      .bp-empty p { max-width: 560px; margin: 0; color: var(--dsh-text-secondary, #656d76); font-size: 13px; line-height: 1.7; }
      .bp-empty-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
      .bp-empty-actions .bp-btn { height: 32px; padding: 0 12px; font-size: 12px; }
      .bp-empty-actions .bp-btn[data-primary="true"] { color: #fff; background: var(--bp-accent); border-color: var(--bp-accent); }
      .bp-empty-actions .bp-btn[data-primary="true"]:hover { color: #fff; filter: brightness(.96); }
      .bp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 30px; }
      .bp-grid-card { padding: 11px; background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 9px; }
      .bp-grid-card b { display: block; margin: 6px 0 3px; font-size: 12px; }
      .bp-grid-card span { color: var(--dsh-text-secondary, #656d76); font-size: 10px; line-height: 1.5; }
      .bp-grid-icon { color: var(--bp-accent); font-size: 14px; }
      .bp-loading { padding: 30px 4px; color: var(--dsh-text-secondary, #656d76); font-size: 12px; }
      .bp-error { padding: 10px; color: var(--bp-danger); font-size: 11px; white-space: pre-wrap; }
      .bp-btn[data-primary="true"] { color: #fff; background: var(--bp-accent); border-color: var(--bp-accent); }
      .bp-btn[data-primary="true"]:hover:not(:disabled) { color: #fff; filter: brightness(.96); }
      .bp-btn:focus-visible, .bp-stage:focus-visible, .bp-input:focus-visible { outline: 2px solid var(--bp-accent); outline-offset: 2px; }
      .bp-top-actions .bp-btn[data-badge="true"] { color: var(--bp-accent); border-color: color-mix(in srgb, var(--bp-accent) 34%, var(--dsh-border-default, #d8dee4)); }
      .bp-start { flex: 1; height: 100%; min-height: 0; overflow: auto; padding: 26px 28px 24px; }
      .bp-start-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; max-width: 760px; margin: 0 auto 16px; }
      .bp-start-head h2 { margin: 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
      .bp-start-head p { max-width: 560px; margin: 0; color: var(--dsh-text-secondary, #656d76); font-size: 12px; line-height: 1.65; }
      .bp-start-time { flex: none; padding: 3px 9px; color: var(--dsh-text-secondary, #656d76); background: var(--dsh-surface-subtle, #f6f8fa); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 999px; font-size: 10px; white-space: nowrap; }
      .bp-step { display: flex; gap: 12px; max-width: 760px; margin: 0 auto 10px; padding: 14px; background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 10px; }
      .bp-step[data-active="true"] { border-color: color-mix(in srgb, var(--bp-accent) 36%, var(--dsh-border-default, #d8dee4)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--bp-accent) 7%, transparent); }
      .bp-step[data-done="true"] { background: color-mix(in srgb, var(--bp-success) 4%, var(--dsh-surface-default, #fff)); }
      .bp-step-index { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; color: var(--dsh-text-secondary, #656d76); background: var(--dsh-surface-subtle, #f6f8fa); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 50%; font-size: 11px; font-weight: 700; }
      .bp-step[data-active="true"] .bp-step-index { color: #fff; background: var(--bp-accent); border-color: var(--bp-accent); }
      .bp-step[data-done="true"] .bp-step-index { color: var(--bp-success); background: color-mix(in srgb, var(--bp-success) 12%, transparent); border-color: transparent; }
      .bp-step-body { min-width: 0; flex: 1; }
      .bp-step-title { font-size: 12px; font-weight: 650; }
      .bp-step-desc { margin: 3px 0 9px; color: var(--dsh-text-secondary, #656d76); font-size: 11px; line-height: 1.6; }
      .bp-step-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      .bp-step-row { display: flex; flex-wrap: wrap; gap: 6px; }
      .bp-step-note { color: var(--bp-success); font-size: 11px; }
      .bp-step-evidence { color: var(--dsh-text-secondary, #656d76); font: 9px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
      .bp-input { height: 27px; min-width: 190px; padding: 0 8px; color: inherit; background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 7px; font: inherit; font-size: 11px; }
      .bp-start-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; max-width: 760px; margin: 14px auto 0; padding-top: 12px; border-top: 1px solid var(--dsh-border-default, #d8dee4); color: var(--dsh-text-secondary, #656d76); font-size: 10px; }
      .bp-help { position: absolute; top: 54px; right: 14px; z-index: 20; width: min(370px, calc(100% - 28px)); padding: 12px; background: var(--dsh-surface-default, #fff); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 10px; box-shadow: 0 12px 34px rgba(15, 23, 42, .16); }
      .bp-help-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 9px; font-size: 12px; }
      .bp-help-list { display: flex; flex-direction: column; gap: 7px; }
      .bp-help-item { display: flex; gap: 7px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; line-height: 1.55; }
      .bp-help-item b { display: block; color: var(--dsh-text-primary, #1f2328); font-size: 11px; font-weight: 600; }
      .bp-help-icon { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex: none; margin-top: 1px; color: var(--bp-accent); background: color-mix(in srgb, var(--bp-accent) 8%, transparent); border-radius: 4px; font-size: 9px; }
      .bp-help-title { margin: 12px 0 6px; color: var(--dsh-text-secondary, #656d76); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .bp-help-keys > div { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; }
      .bp-help-keys kbd { min-width: 54px; padding: 1px 6px; color: var(--dsh-text-primary, #1f2328); background: var(--dsh-surface-subtle, #f6f8fa); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 4px; font: inherit; font-size: 9px; text-align: center; }
      .bp-help > .bp-btn { width: 100%; margin-top: 10px; justify-content: center; }
      .bp-banner { display: flex; align-items: center; gap: 8px; margin: 0 12px 8px; padding: 8px 10px; color: var(--bp-warning); background: color-mix(in srgb, var(--bp-warning) 8%, transparent); border: 1px solid color-mix(in srgb, var(--bp-warning) 26%, transparent); border-radius: 8px; font-size: 10px; }
      .bp-banner span { flex: 1; }
      .bp-skeleton { display: flex; flex-direction: column; gap: 10px; width: 100%; min-height: 320px; padding: 14px; }
      .bp-skeleton-bar { display: flex; align-items: center; gap: 6px; color: var(--dsh-text-secondary, #656d76); font-size: 10px; }
      .bp-skeleton-dot { width: 6px; height: 6px; background: var(--bp-accent); border-radius: 50%; animation: bp-pulse 1.1s ease-in-out infinite; }
      .bp-skeleton-canvas { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 10px; padding: 24px; background: var(--dsh-surface-subtle, #f6f8fa); border: 1px dashed var(--dsh-border-default, #d8dee4); border-radius: 8px; }
      .bp-skeleton-line { height: 12px; background: linear-gradient(90deg, #eef1f4, #e3e8ee, #eef1f4); background-size: 200% 100%; border-radius: 6px; animation: bp-shimmer 1.5s linear infinite; }
      .bp-skeleton-detail { margin: 0; color: var(--dsh-text-secondary, #656d76); font-size: 10px; }
      .bp-error-brief { width: 100%; max-height: 64px; overflow: auto; margin: 0; padding: 8px; color: var(--bp-danger); background: var(--dsh-surface-subtle, #f6f8fa); border: 1px solid var(--dsh-border-default, #d8dee4); border-radius: 6px; font: 10px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: left; white-space: pre-wrap; }
      .bp-log { width: 100%; max-height: 190px; overflow: auto; margin: 0; padding: 8px; color: #e2e8f0; background: #0f172a; border-radius: 6px; font: 10px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: left; white-space: pre-wrap; }
      @keyframes bp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      @keyframes bp-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .bp-skeleton-line, .bp-skeleton-dot { animation: none; }
      }
      @media (max-width: 1280px) {
        .bp-body { grid-template-columns: 176px minmax(0, 1fr) 256px; }
      }
      @media (max-width: 900px) {
        .bp-body { grid-template-columns: 172px minmax(0, 1fr); }
        .bp-inspector { display: none; }
      }
      @media (max-width: 720px) {
        .bp-body { grid-template-columns: minmax(0, 1fr); }
        .bp-rail { display: none; }
        .bp-project { display: none; }
        .bp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
      if (!status?.prototype?.devScript) return { stage: "prototype", label: "接入原型 dev server", detail: status?.prototype?.reason || "在工作区的应用目录 package.json 添加 dev 脚本，Bee Press 会启动真实原型并把它嵌进操作台。" };
      if (status?.prototype?.installed === false) return { stage: "prototype", label: "安装原型依赖", detail: status.prototype.reason || "先安装依赖，Bee Press 才能启动真实原型。" };
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
        return localStorage.getItem("beepress.cockpit.stage") || "prototype";
      } catch {
        return "prototype";
      }
    }

    function writeCockpitStage(stage) {
      try {
        localStorage.setItem("beepress.cockpit.stage", stage);
      } catch {
        // Keep the in-memory stage when storage is unavailable.
      }
    }

    const COCKPIT_CWD_KEY = "beepress.cockpit.cwd";

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
        ["▥", "内容锁", "文档、引用、截图与录屏统一验收。"],
        ["↗", "发布 dry-run", "目的地适配器先演练，再真正发布。"],
      ];
      return h(
        "div",
        { className: "bp-empty" },
        h(
          "div",
          { className: "bp-empty-inner" },
          h("div", { className: "bp-kicker" }, "Bee Press · Prototype to production"),
          h("h1", null, "把你的 vibecoding 玩具", h("br"), "变成生产级产品应用"),
          h("p", null, "Bee Press 是 DSH 之上的原型开发操作台：需求、真实原型、源码锚点评审、内容锁和发布，在同一条流水线上完成。"),
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

    function CockpitRail({ data, stage, goStage }) {
      return h(
        "aside",
        { className: "bp-rail" },
        h("div", { className: "bp-rail-label" }, "生产流水线"),
        STAGES.map((item) => {
          const state = stageState(item.key, data);
          return h(
            "button",
            {
              key: item.key,
              className: "bp-stage",
              "data-active": String(item.key === stage),
              onClick: () => goStage(item.key),
            },
            h("span", { className: "bp-stage-icon" }, item.icon),
            h(
              "span",
              { style: { minWidth: 0 } },
              h("span", { className: "bp-stage-title" }, item.title),
              h("span", { className: "bp-stage-desc" }, item.description),
              h("span", { className: "bp-stage-state", style: state.ready ? { color: "var(--bp-success)" } : undefined }, h("span", { className: "bp-dot" }), state.label),
            ),
          );
        }),
      );
    }

    function CockpitInspector({ cwd, data, state, reload, goStage }) {
      const [output, setOutput] = React.useState("");
      const reviews = data?.reviews?.comments || [];
      const next = nextAction(data);
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
        { className: "bp-inspector" },
        h(
          "section",
          { className: "bp-inspector-block" },
          h("div", { className: "bp-inspector-title" }, h("span", null, "下一步"), state.loading ? h("span", null, "刷新中") : null),
          h(
            "div",
            { className: "bp-next" },
            h("div", { className: "bp-next-label" }, "建议动作"),
            h("div", { className: "bp-next-title" }, next.label),
            h("div", { className: "bp-next-detail" }, next.detail),
            h("button", { className: "bp-btn", onClick: () => goStage(next.stage) }, "去处理 →"),
          ),
        ),
        h(
          "section",
          { className: "bp-inspector-block" },
          h("div", { className: "bp-inspector-title" }, h("span", null, "待处理批注"), h("span", null, String(reviews.length))),
          reviews.length
            ? reviews.slice(0, 5).map((review) =>
                h(
                  "div",
                  { className: "bp-card bp-review-item", key: review.id },
                  h("div", { className: "bp-review-body" }, review.body),
                  h("div", { className: "bp-review-meta" }, [review.frs, review.route, review.author].filter(Boolean).join(" · ")),
                  h("button", { className: "bp-btn", onClick: () => resolve(review.id) }, "标记解决"),
                ),
              )
            : h("div", { className: "bp-card", style: { color: "var(--dsh-text-secondary, #656d76)", fontSize: "10px" } }, "没有待处理批注。原型里的评论会实时出现在这里。"),
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
        window.addEventListener("beepress:restart-prototype", restart);
        return () => window.removeEventListener("beepress:restart-prototype", restart);
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
          { className: "bp-preview-head" },
          h(
            "div",
            { className: "bp-preview-url" },
            h("span", { className: "bp-live", "data-off": String(!url) }),
            h("code", { title: url || "" }, url || (starting || installing ? "正在准备原型…" : "等待原型服务")),
            embed?.route ? h("span", null, "· ", embed.route) : null,
          ),
          h(
            "div",
            { className: "bp-preview-actions" },
            h(
              "div",
              { className: "bp-seg" },
              [
                ["100%", "桌面"],
                ["768px", "平板"],
                ["390px", "手机"],
              ].map(([value, label]) => h("button", { key: value, "data-on": String(width === value), onClick: () => setWidth(value) }, label)),
            ),
            h("button", { className: "bp-btn", onClick: refresh, disabled: !url, title: "刷新原型" }, "刷新"),
            h("button", { className: "bp-btn", onClick: () => bridge.openBrowser(url), disabled: !url, title: "在 DSH 浏览器标签中打开完整评审页" }, "浏览器"),
          ),
        ),
        h(
          "div",
          { className: "bp-review-strip" },
          h(
            "div",
            { className: "bp-review-frs" },
            h("span", { className: "bp-review-label" }, "FRS"),
            frs.length ? frs.map((item) => h("span", { className: "bp-tag", key: item.key, title: item.title }, item.key)) : h("span", { className: "bp-tag" }, "APP_SHELL"),
            embed && !embed.persistent ? h("span", { className: "bp-warn" }, "⚠ 未持久化") : null,
            h("span", { className: "bp-count" }, `待解决 ${open}`),
          ),
          h(
            "div",
            { className: "bp-review-actions" },
            h("button", { className: "bp-btn", "data-on": String(Boolean(embed?.commentMode)), disabled: !bridgeReady, onClick: () => send("comment-mode", !embed?.commentMode), title: bridgeReady ? "切换常驻评论模式；也可以按住 ⌘/Ctrl 临时圈选" : "原型还没有接入 Bee Review 桥" }, embed?.commentMode ? "点选中" : "评论"),
            h("button", { className: "bp-btn", disabled: !bridgeReady, onClick: () => send("toggle-drawer"), title: "打开或关闭原型内的评论抽屉" }, `评论区${routeOpen ? ` · ${routeOpen}` : ""}`),
            h("button", { className: "bp-btn", disabled: !bridgeReady, onClick: () => send("open-studio"), title: "打开内容检查台" }, "内容台"),
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
                    title: "Bee Press prototype",
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

      const adopt = async () => {
        setBusy("baseline");
        setMessage("");
        try {
          await request("/baseline", { root: cwd, stack: detected.stack || "existing", uiPreset: "bee-press" });
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

      const baselineDone = Boolean(baseline.stack);
      const requirementsDone = (features.specs || 0) > 0;
      const prototypeDone = Boolean(runner.url);
      const status = runner.status || {};
      const prototypeHint = !status.found
        ? "这个工作区没有可运行的前端应用。可以换一个工作区，或在应用目录加一个 dev 脚本。"
        : status.installed === false
          ? `${status.packageManager || "npm"} 依赖还没安装，Bee Press 可以直接替你装好并启动。`
          : `将运行 ${status.packageManager || "npm"} run dev（${status.devScript}）${status.dir && status.dir !== "." ? `，应用目录 ${status.dir}` : ""}。`;

      return h(
        "div",
        { className: "bp-start" },
        h(
          "header",
          { className: "bp-start-head" },
          h("div", null,
            h("div", { className: "bp-kicker" }, "首次进入"),
            h("h2", null, "三步把原型跑起来"),
            h("p", null, "不用先学概念。每步只做一件事，跳过任何一步都能继续用。"),
          ),
          h("span", { className: "bp-start-time" }, "大约 1 分钟"),
        ),
        h(
          StartStep,
          {
            index: 1,
            title: "确认技术栈",
            description: detected.stack
              ? `检测到 ${detected.label}${detected.typescript ? " · TypeScript" : ""}${detected.bundler ? ` · ${detected.bundler}` : ""}。确认后需求、原型和规范会用同一套基线。`
              : "没有识别出技术栈，手动选一下就行，之后可以改。",
            state: baselineDone ? "done" : "active",
          },
          baselineDone
            ? h("span", { className: "bp-step-note" }, `已确认：${baseline.stack}`)
            : [
                detected.stack
                  ? h("button", { className: "bp-btn", "data-primary": "true", disabled: busy === "baseline", onClick: adopt }, busy === "baseline" ? "保存中…" : "采用检测结果")
                  : null,
                h("button", { className: "bp-btn", onClick: () => goStage("baseline") }, detected.stack ? "手动选择" : "选择技术栈"),
                detected.evidence?.length ? h("span", { className: "bp-step-evidence" }, detected.evidence.slice(0, 3).join(" · ")) : null,
              ],
        ),
        h(
          StartStep,
          {
            index: 2,
            title: "写第一条需求",
            description: requirementsDone
              ? `已经有 ${features.specs} 份需求件套，可以直接在原型上批注了。`
              : "给要做的功能起个名字，Bee Press 会生成 FRS、流程和验收模板。",
            state: requirementsDone ? "done" : baselineDone ? "active" : "idle",
          },
          requirementsDone
            ? h("button", { className: "bp-btn", onClick: () => goStage("requirements") }, "看需求")
            : h(
                "div",
                { className: "bp-step-row" },
                h("input", {
                  className: "bp-input",
                  placeholder: "例如：登录改版",
                  value: title,
                  onChange: (event) => setTitle(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") create();
                  },
                }),
                h("button", { className: "bp-btn", "data-primary": "true", disabled: !title.trim() || busy === "requirements", onClick: create }, busy === "requirements" ? "创建中…" : "创建需求件套"),
              ),
        ),
        h(
          StartStep,
          {
            index: 3,
            title: "启动原型",
            description: prototypeHint,
            state: prototypeDone ? "done" : "active",
          },
          prototypeDone
            ? h("span", { className: "bp-step-note" }, `已运行：${runner.url}`)
            : [
                status.found && status.installed === false
                  ? h("button", { className: "bp-btn", "data-primary": "true", disabled: runner.installing || runner.starting, onClick: runner.install }, runner.installing ? "正在安装依赖…" : runner.starting ? "正在启动…" : "安装依赖并启动")
                  : null,
                status.found && status.installed !== false
                  ? h("button", { className: "bp-btn", "data-primary": "true", disabled: runner.starting, onClick: runner.start }, runner.starting ? "正在启动…" : "启动原型")
                  : null,
                !status.found ? h("button", { className: "bp-btn", onClick: () => bridge.pickProject().catch(() => {}) }, "切换工作区") : null,
                h("button", { className: "bp-btn", onClick: () => goStage("prototype") }, "看详细信息"),
              ],
        ),
        runner.error ? h(PrototypeFailure, { error: runner.error, found: runner.found, installing: runner.installing, onRetry: runner.start, onInstall: runner.install, onSwitch: () => bridge.pickProject().catch(() => {}) }) : null,
        message ? h("div", { className: "bp-error" }, message) : null,
        h(
          "footer",
          { className: "bp-start-foot" },
          h("span", null, "引导只在原型未就绪时出现。"),
          h("button", { className: "bp-btn", onClick: onSkip }, "跳过引导，直接使用操作台"),
        ),
      );
    }

    const START_SKIP_PREFIX = "beepress.start.skip.";

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
        { className: "bp-help", role: "dialog", "aria-modal": "false", "aria-label": "Bee Press 帮助" },
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
      }, [cwd]);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape" && help) {
            setHelp(false);
            helpButton.current?.focus();
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            const tag = String(document.activeElement?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;
            event.preventDefault();
            window.dispatchEvent(new Event("beepress:restart-prototype"));
          }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [help]);
      return h(
        "div",
        { className: "bp-cockpit", "data-beepress-cockpit": stage },
        h("style", null, cockpitCss),
        h(
          "header",
          { className: "bp-top" },
          h(
            "div",
            { className: "bp-brand" },
            h("div", { className: "bp-brand-mark" }, h(BeeIcon, { size: 17 })),
            h("div", null, h("div", { className: "bp-brand-name" }, "Bee Press"), h("div", { className: "bp-brand-sub" }, "Prototype to production")),
          ),
          h(
            "div",
            { className: "bp-project" },
            h("div", { className: "bp-project-label" }, "当前工作区"),
            h("div", { className: "bp-project-name" }, projectName(cwd)),
            cwd ? h("code", { className: "bp-project-path", title: cwd }, cwd) : null,
          ),
          h(
            "div",
            { className: "bp-top-actions" },
            h("button", { className: "bp-btn", "data-badge": String(openReviewCount(data) > 0), onClick: () => setStage("review") }, `批注 ${openReviewCount(data)}`),
            h("button", { className: "bp-btn", ref: helpButton, onClick: () => setHelp((value) => !value), "aria-expanded": String(help), title: "术语、快捷键和重新显示引导" }, "帮助"),
            h("button", { className: "bp-btn", onClick: () => bridge.openChat(), title: "回到 DSH 对话" }, "回到对话"),
            h("button", { className: "bp-btn", onClick: reload, disabled: state.loading }, state.loading ? "刷新中" : "刷新"),
          ),
        ),
        help ? h(CockpitHelp, { cwd, onClose: () => { setHelp(false); helpButton.current?.focus(); }, onShowGuide: () => { writeStartSkip(cwd, false); setSkipStart(false); setForceGuide(true); setStage("prototype"); setHelp(false); } }) : null,
        !cwd
          ? h(CockpitEmpty)
          : h(
              "div",
              { className: "bp-body" },
              h(CockpitRail, { data, stage, goStage: setStage }),
              h(
                "main",
                { className: "bp-main" },
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
                    : h("div", { className: "bp-canvas" }, h(Component, { stage: stageMeta, cwd, state, reload, embedded: true })),
              ),
              h(CockpitInspector, { cwd, data, state, reload, goStage: setStage }),
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

      window.__beepressDesktop = {
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
        "beepress: cockpit",
      );
      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.panellist", () =>
            ctx.slots.register({ name: "sidebar.panellist", id: COCKPIT_PANEL_ID, order: -10, label: () => "Bee Press" }, CockpitIcon),
          ),
        "beepress: cockpit icon",
      );
      const openCockpit = (attempt = 0) => {
        try {
          ctx.layout.selectPanel(COCKPIT_PANEL_ID);
        } catch (error) {
          if (attempt < 20) setTimeout(() => openCockpit(attempt + 1), 150);
          else console.warn("[beepress] could not open cockpit", error);
        }
      };
      setTimeout(() => openCockpit(), 0);

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
      inject: ["slots", "layout", "sidebarRightTabs", "sidebarRight", "shortcuts", "uiWorkspace", "workspaces"],
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
