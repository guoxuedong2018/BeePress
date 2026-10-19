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
import { getHost } from "./host";

/**
 * 套件根：把两个平级套件组装起来。
 *
 *   review  对原型的意见 —— 圈选批注，落 docs/reviews/
 *   studio  内容审阅台 —— 哪些文档要审、哪些图该重拍、发布到云文档
 *
 * 两个套件互不 import，由这里接线：审阅台的入口放进评审工具栏的 tools 位，
 * 审阅台的整屏浮层与评审的圈选层同级。工具栏和抽屉画进宿主留的格子（portal），
 * 其余浮层画在套件自己的根里。
 */
export function App() {
  const host = getHost();
  const snap = useSnapshot(reviewState);

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

  return (
    <>
      {createPortal(<ReviewBar tools={<StudioEntry />} />, host.slots.bar)}
      {createPortal(<CommentDrawer />, host.slots.drawer)}
      <CommentLayer />
      <StudioRoot />
    </>
  );
}
