import { useSnapshot } from "valtio";

import { Btn, Icon } from "../core/ui";
import { openStudio, studioState } from "./store";

/**
 * 内容审阅台在评审工具栏里的入口。
 *
 * 不在入口上挂待审计数：算一次工作清单要比对截图，每次打开原型都算一遍不划算。
 * 也不做成页面右下角的浮标——原型里列表页占多数，那个位置是分页控件的地盘。
 */
export function StudioEntry() {
  const snap = useSnapshot(studioState);
  return (
    <Btn kind={snap.open ? "primary" : undefined} title="打开内容审阅台：哪些文档要审、哪些图该重拍、发布到宿主配置的目标端" onClick={openStudio}>
      <Icon name="doc" />
      内容
    </Btn>
  );
}
