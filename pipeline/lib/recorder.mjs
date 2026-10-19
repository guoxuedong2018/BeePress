/**
 * 页面操作录屏
 * ------------------------------------------------------------------
 * 用 CDP 的 `Page.startScreencast` 逐帧收页面重绘，配一个**合成光标**，
 * 再用 ffmpeg 按每帧真实时间戳拼成变帧率视频。
 *
 * 为什么要自己画光标：screencast 抓的是页面渲染结果，**系统光标不参与合成**。
 * 直接录出来是「东西自己在动、没有指针」，看着像故障。
 *
 * 自己画反而更好：指针由我们驱动，于是可以缓动、可以点击前停顿、可以画涟漪、
 * 可以给目标套高亮环。真人手录做不到这些，还会手抖、会点错、改一次页面就得重录。
 *
 * 为什么必须变帧率：`Page.screencastFrame` 只在页面**重绘时**才触发，
 * 静止段一帧都不产。按固定 fps 拼接会把「停在这里两秒让人看清」压成闪一下。
 * 所以每帧的显示时长取自 `metadata.timestamp` 的差值。
 */

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import { boundingBox, evaluate, waitFor } from "./cdp.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 缓动：两端慢中间快，比线性像人手 */
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * 往页面里装一个合成光标。
 *
 * 位置由**页面自己**的 mousemove 监听驱动，而不是每帧从 Node 再发一条指令——
 * `Input.dispatchMouseEvent` 本来就会在页面里产生真实 mousemove，顺手用掉，
 * 少一半往返，而且指针位置与真实命中点天然同步、不会漂。
 *
 * 这里的色值是录屏叠加层、不是产品界面，直接写死；仓库那条「色值走 @color-*」
 * 约束的是原型应用的样式。
 *
 * 同时装上字幕层。字幕直接画在页面里、不事后用 ffmpeg 烧，理由是中文：
 * drawtext 要自己指定字体文件、自己算换行和居中，而页面里一个 div 加几行 CSS
 * 就有完美的中文排版、圆角底衬和淡入淡出。既然帧本来就是我们自己造的，
 * 排版交给浏览器最省事。时间轴另外落一份 .srt，将来重剪不用从画面里抠字。
 *
 * ⚠️ 注入的页面代码是模板字符串，里面**不能出现反引号**——会提前闭合外层字符串。
 */
export async function installCursor(session) {
  await evaluate(
    session,
    `(() => {
      if (window.__recCursor) return;
      const wrap = document.createElement('div');
      wrap.id = '__rec_cursor';
      wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform';
      wrap.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 26 26" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">' +
        '<path d="M5 3 L5 20 L9.6 15.8 L12.6 22.4 L15.6 21 L12.6 14.6 L18.6 14.4 Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/>' +
        '</svg>';
      document.body.appendChild(wrap);
      window.__recCursor = wrap;

      document.addEventListener('mousemove', (e) => {
        wrap.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      }, true);

      /** 点击涟漪：一圈扩散消失的环，让「这里被点了」在视频里看得见 */
      window.__recRipple = (x, y) => {
        const r = document.createElement('div');
        r.style.cssText = [
          'position:fixed', 'left:' + (x - 6) + 'px', 'top:' + (y - 6) + 'px',
          'width:12px', 'height:12px', 'border-radius:50%',
          'border:2px solid #f5222d', 'z-index:2147483646', 'pointer-events:none',
          'opacity:0.9', 'transition:all .45s ease-out',
        ].join(';');
        document.body.appendChild(r);
        requestAnimationFrame(() => {
          r.style.transform = 'scale(4.5)';
          r.style.opacity = '0';
        });
        setTimeout(() => r.remove(), 520);
      };

      // 字幕（为什么画在页面里而不是事后烧，见函数上方说明）
      window.__recCaption = (text, bottom) => {
        let c = document.getElementById('__rec_cap');
        if (!c) {
          c = document.createElement('div');
          c.id = '__rec_cap';
          c.style.cssText = [
            // 80px 而不是贴底：页面底栏是钉在容器底部的，贴底会把主操作按钮压住
            'position:fixed', 'left:50%', 'bottom:80px', 'transform:translateX(-50%)',
            'max-width:72%', 'padding:10px 20px', 'border-radius:8px',
            'background:rgba(20,22,26,.88)', 'color:#fff',
            'font:500 17px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
            'text-align:center', 'z-index:2147483644', 'pointer-events:none',
            'opacity:0', 'transition:opacity .28s ease', 'white-space:pre-wrap',
          ].join(';');
          document.body.appendChild(c);
        }
        if (bottom) c.style.bottom = bottom + 'px';
        if (!text) { c.style.opacity = '0'; return; }
        c.textContent = text;
        requestAnimationFrame(() => { c.style.opacity = '1'; });
      };

      /** 目标高亮环：录到关键控件时套一圈，观众一眼知道在说哪个 */
      window.__recHighlight = (rect, on) => {
        let h = document.getElementById('__rec_hl');
        if (!on) { if (h) h.remove(); return; }
        if (!h) {
          h = document.createElement('div');
          h.id = '__rec_hl';
          h.style.cssText = 'position:fixed;z-index:2147483645;pointer-events:none;border:2px solid #f5222d;border-radius:5px;transition:all .25s ease';
          document.body.appendChild(h);
        }
        h.style.left = (rect.x - 4) + 'px';
        h.style.top = (rect.y - 4) + 'px';
        h.style.width = (rect.width + 8) + 'px';
        h.style.height = (rect.height + 8) + 'px';
      };
    })()`,
  );
}

/**
 * 藏掉 dev 专有的界面。
 *
 * 截图靠 `clip` 裁到具体区块，天然避开了评审工具栏；录屏抓的是**整个视口**，
 * 不处理的话「FRS / 常规紧凑 / 亮暗 / 评论」那条会一路跟到成片里，
 * 而它对用户根本不存在。
 */
/**
 * 放大页面渲染。
 *
 * 实测 `Page.startScreenRecording` **按 CSS 视口尺寸录制，忽略 deviceScaleFactor**
 * （视口 1280×720 配 scale=3、页面自报 devicePixelRatio=3，成片仍是 1280×720）。
 * 所以想要 1080p 成片，视口就必须是 1920×1080——可那样布局摊得更开、
 * 文字在画面里占比更小，反而更难看清。
 *
 * zoom 把两者解耦：视口给足 1920×1080 拿像素，再让页面**按 1920/zoom 的宽度排版**，
 * 于是 12px 的字落到画面上是 12×zoom 个实像素。清晰度和版面宽度可以分别调。
 */
export async function setZoom(session, zoom) {
  if (!zoom || zoom === 1) return;
  await evaluate(
    session,
    `(() => {
      let s = document.getElementById('__rec_zoom');
      if (!s) {
        s = document.createElement('style');
        s.id = '__rec_zoom';
        document.head.appendChild(s);
      }
      s.textContent = ':root { zoom: ${zoom}; }';
    })()`,
  );
}

export async function hideDevChrome(session) {
  await evaluate(
    session,
    `(() => {
      let style = document.getElementById('__rec_hide_dev');
      if (style) return;
      style = document.createElement('style');
      style.id = '__rec_hide_dev';
      style.textContent = '.review-bar { display: none !important; }';
      document.head.appendChild(style);
    })()`,
  );
}

/** 真实鼠标移动（页面里的 hover / mouseenter 会照常触发） */
async function moveMouse(session, x, y) {
  await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
}

/**
 * 把光标从当前位置缓动到目标点。
 *
 * 每步发一条真实 mouseMoved：页面据此同时更新合成光标与 hover 态，
 * 所以录出来的悬停效果（下拉高亮、tooltip）是真的，不是画上去的。
 */
export async function glideTo(session, state, x, y, duration = 600) {
  const steps = Math.max(6, Math.round(duration / 16));
  const [x0, y0] = [state.x, state.y];
  for (let i = 1; i <= steps; i += 1) {
    const t = easeInOut(i / steps);
    await moveMouse(session, x0 + (x - x0) * t, y0 + (y - y0) * t);
    await sleep(duration / steps);
  }
  state.x = x;
  state.y = y;
}

/**
 * 移到某个选择器的中心。
 *
 * 先确保目标在视口内再量坐标：`boundingBox` 给的是**视口坐标**，目标在折叠下方时
 * 算出来是视口外的点，`Input.dispatchMouseEvent` 会把这一下点在空处——
 * 表现就是「动作全做了但什么也没发生」，而且不报错。
 */
export async function glideToSelector(session, state, selector, duration) {
  if (!(await waitFor(session, selector))) throw new Error(`移动目标不存在 «${selector}»`);

  // 两轮：第一轮命中不了就滚到视口中间再试
  let probe;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    probe = await hitTest(session, selector);
    if (probe.hit) break;
    await evaluate(
      session,
      `window.__protoFind(${JSON.stringify(selector)}).scrollIntoView({ block: 'center', inline: 'center' })`,
    );
    await sleep(450);
  }
  if (!probe.hit) {
    throw new Error(
      `目标点不到 «${selector}»：那个坐标上是 ${probe.blockedBy ?? "空白"}` +
        `（元素在视口内但被挡住，最常见的是钉底的页面底栏）`,
    );
  }

  await glideTo(session, state, probe.cx, probe.cy, duration);
  return probe.box;
}

/**
 * 命中测试：这个坐标点下去，真的会落在目标上吗。
 *
 * 只查边界框不够——元素可以「在视口内」却被钉底的底栏、浮层或吸顶表头盖住。
 * 那种情况下 `Input.dispatchMouseEvent` 会把这一下点在遮挡物上，
 * 动作全做了、什么也没发生，而且不报错。这是录屏里最难查的一类哑火。
 */
async function hitTest(session, selector) {
  return evaluate(
    session,
    `(() => {
      const el = window.__protoFind(${JSON.stringify(selector)});
      if (!el) return { hit: false, blockedBy: null };
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const box = { x: r.x, y: r.y, width: r.width, height: r.height };
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) {
        return { hit: false, blockedBy: '视口外', cx, cy, box };
      }
      const top = document.elementFromPoint(cx, cy);
      const hit = !!top && (top === el || el.contains(top) || top.contains(el));
      return {
        hit, cx, cy, box,
        blockedBy: hit ? null : (top ? top.tagName.toLowerCase() + (top.className ? '.' + String(top.className).split(' ')[0] : '') : null),
      };
    })()`,
  );
}

/** 在当前位置点下去：涟漪 + 真实 press/release */
export async function clickHere(session, state, { ripple = true } = {}) {
  if (ripple) {
    await evaluate(session, `window.__recRipple(${state.x}, ${state.y})`);
  }
  const base = { x: state.x, y: state.y, button: "left", clickCount: 1 };
  await session.send("Input.dispatchMouseEvent", { type: "mousePressed", ...base });
  await sleep(90);
  await session.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...base });
}

/** 给某个元素套高亮环；传 null 取消 */
export async function highlight(session, selector) {
  if (!selector) {
    await evaluate(session, "window.__recHighlight(null, false)");
    return;
  }
  const box = await boundingBox(session, selector);
  if (!box) return;
  await evaluate(session, `window.__recHighlight(${JSON.stringify(box)}, true)`);
}

/** 显示 / 清除字幕 */
export async function showCaption(session, text, bottom) {
  await evaluate(session, `window.__recCaption(${JSON.stringify(text ?? null)}, ${bottom ?? 'null'})`);
}

/** 单段上限。超过就该拆成多段——太长的片子没人看完，重录一次代价也太大 */
export const MAX_CLIP_SECONDS = 180;

/**
 * 逐帧录制：抓无损 PNG 帧，流式喂给常驻 ffmpeg。
 *
 * 为什么不用 `Page.startScreenRecording`：它只能传 audio / maxWidth / maxHeight /
 * frameRate，**没有任何质量参数**，码率由 Chrome 自己定（实测 1080p 只给到
 * 约 480 kbps）。屏幕录像全是细小文字，这个码率下字边缘直接糊掉，
 * 而且是在源头就丢了，后面再怎么调 CRF 都找不回来。
 *
 * 逐帧这条路 PNG 是无损的，码率完全由我们定。代价是要自己处理三件事，
 * 都按 Puppeteer ScreenRecorder 的做法解决：
 *
 * 1. **内存**：不把帧攒在内存里，边收边写进 ffmpeg 的 stdin。
 * 2. **时间轴**：`screencastFrame` 只在重绘时触发、疏密不均，
 *    按「恒定 fps 网格」把每帧重复若干次，总帧数恒等于 round(fps × 时长)。
 * 3. **`-framerate` 必须在 `-i` 之前**——它是输入选项，放后面 image2pipe
 *    会按默认 25fps 解析，输出时间轴相对喂帧速率被拉长。
 */
export function startFrameRecording(session, outFile, { fps = 30, crf = 12 } = {}) {
  const ff = spawn(
    "ffmpeg",
    [
      "-v", "error",
      "-framerate", String(fps), // 必须在 -i 之前
      "-f", "image2pipe", "-vcodec", "png", "-i", "pipe:0",
      "-an",
      // 采集这一趟求快且近乎无损，成片质量在 assemble 里定
      "-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf),
      "-pix_fmt", "yuv420p", outFile, "-y",
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let ffErr = "";
  ff.stderr.on("data", (d) => (ffErr += d));

  let startTs = null;
  let prevTs = null;
  let prevBuf = null;
  let written = 0;

  /** 某一帧应该占几个网格位：用累计位置取整后做差，避免快帧向上取整、慢帧被丢 */
  const slots = (from, to) =>
    Math.max(0, Math.round((to - startTs) * fps) - Math.round((from - startTs) * fps));

  const push = (buf, n) => {
    for (let i = 0; i < n; i += 1) ff.stdin.write(buf);
    written += n;
  };

  const off = session.on("Page.screencastFrame", ({ data, sessionId, metadata }) => {
    // ack 必须逐帧回，否则 Chrome 认为客户端没消费完、直接停发
    session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    const ts = metadata.timestamp;
    const buf = Buffer.from(data, "base64");
    if (startTs === null) {
      startTs = ts;
    } else if (prevBuf) {
      // 上一帧一直显示到这一帧到达为止
      push(prevBuf, slots(prevTs, ts));
    }
    prevTs = ts;
    prevBuf = buf;
  });

  const started = session.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

  return {
    ready: started,
    /**
     * 录制中途出错时的收尾。
     *
     * 没有它的时候，一条录屏在某个 beat 上抛错，`stop()` 就再也不会被调用，
     * screencast 一直开着——**同一次运行里后面每一条都会以「Screencast is already
     * active」失败**。一条配方写错选择器，报出来的却是其余所有条都坏了，
     * 排查方向完全被带偏。
     */
    async abort() {
      await session.send("Page.stopScreencast").catch(() => {});
      off();
      ff.kill("SIGKILL");
    },
    async stop({ tail = 0.6 } = {}) {
      await session.send("Page.stopScreencast").catch(() => {});
      off();
      // 收尾：最后一帧补足尾巴，否则画面在最后一次重绘处戛然而止
      if (prevBuf) push(prevBuf, Math.max(1, Math.round(tail * fps)));
      ff.stdin.end();
      const code = await new Promise((r) => ff.on("close", r));
      if (code !== 0) throw new Error(`ffmpeg 退出 ${code}: ${ffErr.slice(0, 400)}`);
      const seconds = written / fps;
      if (seconds > MAX_CLIP_SECONDS) {
        throw new Error(`这一段 ${seconds.toFixed(0)}s，超过 ${MAX_CLIP_SECONDS}s 上限，拆成多段录`);
      }
      return { file: outFile, seconds, frames: written };
    },
  };
}

/**
 * 分段产物 → 成片。
 *
 * 分三步，每步都有非做不可的理由：
 *
 *   1. 逐段定稿。采集那一趟为了跟上实时用的是 veryfast，这里换 medium + 低 CRF
 *      把质量做足；顺带按段施加变速（`setpts`），关键步骤放慢、过场加快。
 *   2. concat 拼接。各段已经统一成同一套编码参数，可以 `-c copy` 直拼、不再重编码。
 *   3. 出 GIF。两趟调色板——单趟的 split+palettegen 会把流收敛成一帧。
 *
 * 分段的意义不只是变速：改了第三步时只重录那一段，前两段原样复用。
 */
export async function assemble(segments, outDir, name, { gif, crf = 16 } = {}) {
  const work = path.join(outDir, `.work-${name.replace(/\W/g, "_")}`);
  await fs.rm(work, { recursive: true, force: true });
  await fs.mkdir(work, { recursive: true });

  const parts = [];
  for (const [i, seg] of segments.entries()) {
    const out = path.join(work, `${i}.mp4`);
    const speed = seg.speed ?? 1;
    const filters = [
      // setpts 只改时间戳，不重采样画面；>1 的分母即放慢
      speed !== 1 ? `setpts=${(1 / speed).toFixed(4)}*PTS` : null,
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "format=yuv420p",
    ].filter(Boolean);
    await run("ffmpeg", [
      "-v", "error", "-i", seg.file,
      "-vf", filters.join(","),
      // CRF 19 而不是 23：屏幕录像全是细小文字，23 会把字边缘糊掉，
      // 而静态画面多、压缩率本来就高，降 CRF 的体积代价很小
      "-c:v", "libx264", "-preset", "medium", "-crf", String(crf),
      "-r", "30", "-movflags", "+faststart", out, "-y",
    ]);
    parts.push(out);
  }

  const mp4 = path.join(outDir, `${name}.mp4`);
  if (parts.length === 1) {
    await fs.copyFile(parts[0], mp4);
  } else {
    const list = path.join(work, "list.txt");
    await fs.writeFile(list, parts.map((p) => `file '${p}'`).join("\n"));
    await run("ffmpeg", [
      "-v", "error", "-f", "concat", "-safe", "0", "-i", list,
      "-c", "copy", "-movflags", "+faststart", mp4, "-y",
    ]);
  }

  /**
   * GIF 只对**短循环**有意义。
   *
   * 十几秒的讲解片出成 GIF 就是好几 MB，还不能暂停、不能拖动——那种场合该用 MP4。
   * GIF 的真正用武之地是更新通告卡片：聊天软件里的卡片通常播不了视频，
   * 需要一段三五秒、能自己循环的动图来表达「新功能长什么样」。
   * 所以默认不出，要出就用 `from` 指定截取哪几段。
   */
  let gifPath = null;
  if (gif) {
    const picked = gif.from
      ? parts.filter((_, i) => gif.from.includes(segments[i].name))
      : parts;
    if (picked.length === 0) throw new Error(`gif.from 没匹配到任何分段：${gif.from}`);

    const src = path.join(work, "gif-src.mp4");
    if (picked.length === 1) {
      await fs.copyFile(picked[0], src);
    } else {
      const list = path.join(work, "gif-list.txt");
      await fs.writeFile(list, picked.map((p) => `file '${p}'`).join("\n"));
      await run("ffmpeg", ["-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", src, "-y"]);
    }

    const palette = path.join(work, "palette.png");
    const filt = `fps=${gif.fps ?? 10},scale=${gif.width ?? 800}:-1:flags=lanczos`;
    await run("ffmpeg", ["-v", "error", "-i", src, "-vf", `${filt},palettegen=max_colors=${gif.colors ?? 96}`, palette, "-y"]);
    gifPath = path.join(outDir, `${name}.gif`);
    await run("ffmpeg", [
      "-v", "error", "-i", src, "-i", palette,
      "-lavfi", `${filt}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
      "-loop", "0", gifPath, "-y",
    ]);
  }

  await fs.rm(work, { recursive: true, force: true });
  return { mp4, gif: gifPath, seconds: await probeDuration(mp4) };
}

/**
 * 字幕轴 → .srt 旁车文件。
 *
 * 画面里已经烧了一份，这份是给「以后要重剪」准备的：
 * 换语言、换样式、或者把视频换个容器时，不用从画面里把字抠出来。
 */
export async function writeSubtitles(cues, outDir, name) {
  if (!cues.length) return null;
  const fmt = (s) => {
    const ms = Math.max(0, Math.round(s * 1000));
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, "0")}`;
  };
  const body = cues
    .map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`)
    .join("\n");
  const file = path.join(outDir, `${name}.srt`);
  await fs.writeFile(file, body);
  return file;
}

function probeDuration(file) {
  return new Promise((resolve) => {
    const p = spawn("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
    ]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("exit", () => resolve(Number(out.trim()) || 0));
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} 退出 ${code}: ${err.slice(0, 400)}`))));
  });
}

export { sleep };
