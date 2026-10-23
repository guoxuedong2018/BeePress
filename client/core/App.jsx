import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useSnapshot } from "valtio";

import { CommentDrawer } from "../review/CommentDrawer";
import { CommentLayer } from "../review/CommentLayer";
import { frsForRoute } from "../review/frs";
import { ReviewBar } from "../review/ReviewBar";
import { loadAll, reviewState, setRoute } from "../review/store";
import { StudioEntry } from "../studio/StudioEntry";
import { StudioRoot } from "../studio/StudioRoot";
import { openStudio } from "../studio/store";
import { getHost } from "./host";

const REVIEW_CHANNEL = "builderharness-review";
const EMBED_QUERY = "builderharness_embed";

function embeddedInCockpit() {
  try {
    return new URLSearchParams(window.location.search).get(EMBED_QUERY) === "1";
  } catch {
    return false;
  }
}

/**
 * 套件根：把两个平级套件组装起来。
 *
 *   review  对原型的意见 —— 圈选批注，落 docs/reviews/
 *   studio  内容检查台 —— 哪些文档要审、哪些图该重拍、发布到宿主配置的目标端
 *
 * 两个套件互不 import，由这里接线：审阅台的入口放进评审工具栏的 tools 位，
 * 审阅台的整屏浮层与评审的圈选层同级。工具栏和抽屉画进宿主留的格子（portal），
 * 其余浮层画在套件自己的根里。
 */
export function App() {
  const host = getHost();
  const snap = useSnapshot(reviewState);
  const embedded = embeddedInCockpit();
  const totalOpen = snap.comments.filter((c) => c.status === "open").length;
  const routeOpen = snap.comments.filter((c) => c.route === snap.route && c.status === "open").length;

  useEffect(() => {
    loadAll();
    setRoute(host.router.current());
    return host.router.subscribe((path) => setRoute(path));
  }, [host]);

  // 原型内容区打上当前路由的区域标记：锚点归档时向上找最近的 [data-frs]
  useEffect(() => {
    const list = frsForRoute(snap.route);
    host.slots.content.setAttribute("data-frs", list.length > 0 ? list[0].key : "APP_SHELL");
  }, [host, snap.route]);

  // Cockpit 模式：工具栏由 DSH 主面板承接，原型内只保留圈选层与评论抽屉。
  useEffect(() => {
    if (!embedded) return undefined;
    const post = () =>
      window.parent.postMessage(
        {
          channel: REVIEW_CHANNEL,
          type: "state",
          route: snap.route,
          frs: frsForRoute(snap.route).map((item) => ({ key: item.key, title: item.title })),
          persistent: snap.persistent,
          open: totalOpen,
          routeOpen,
          commentMode: snap.commentMode,
          drawerOpen: snap.drawerOpen,
        },
        "*",
      );
    post();
    return undefined;
  }, [embedded, snap.commentMode, snap.comments.length, snap.drawerOpen, snap.persistent, snap.route, routeOpen, totalOpen]);

  useEffect(() => {
    if (!embedded) return undefined;
    const onMessage = (event) => {
      if (event.source !== window.parent) return;
      const data = event.data;
      if (!data || data.channel !== REVIEW_CHANNEL || data.type !== "command") return;
      if (data.command === "comment-mode") reviewState.commentMode = Boolean(data.value);
      else if (data.command === "toggle-drawer") reviewState.drawerOpen = !reviewState.drawerOpen;
      else if (data.command === "open-studio") openStudio();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedded]);

  return (
    <>
      {!embedded && createPortal(<ReviewBar tools={<StudioEntry />} />, host.slots.bar)}
      {createPortal(<CommentDrawer />, host.slots.drawer)}
      <CommentLayer />
      <StudioRoot />
    </>
  );
}
