// The messages between the embed and the site (contract v1.7, §5.2 and §5.4). Same origin: every
// message is posted to, and only accepted from, `location.origin`.
//
//   ready    once, after the example's first render
//   resize   a `flow` example's content height, whenever it changes; held back while the frame
//            is promoted (overlay promotion), sent once it is back
//   overlay  a modal overlay is about to open / has finished closing, and
//   armed    the stage is pinned for the promoted viewport: overlay promotion (§5.4), driven by
//            each framework's embed host (examples/react/src/embed/overlay-promotion.ts)

import { isThemeName, THEMES, type ThemeName } from "../themes/themes";

export const READY = "fragiola:example:ready";
export const RESIZE = "fragiola:example:resize";
export const THEME = "fragiola:example:theme";

/** What the embed tells the site. */
export type EmbedMessage =
    | { type: typeof READY; id: string }
    | { type: typeof RESIZE; id: string; height: number }
    | { type: "fragiola:example:overlay"; id: string; open: boolean }
    | { type: "fragiola:example:armed"; id: string };

const embedded = window.parent !== window;

/** Posts a message to the site; nothing outside a frame. */
export function post(message: EmbedMessage) {
    if (embedded) window.parent.postMessage(message, location.origin);
}

// While the frame is promoted the site does not size it: the last height waits and goes out once
// the frame is back in place.
let held = false;
let flush: (() => void) | undefined;

/** Holds the height reports while an overlay is promoted (§5.4); releasing sends the last one. */
export function holdResize(hold: boolean) {
    held = hold;
    if (!hold) flush?.();
}

/** Once, after the example's first render. */
export function postReady(id: string) {
    post({ type: READY, id });
}

/** Posts the content height whenever it changes (a `flow` example only). Returns a cleanup. */
export function reportHeight(id: string, content: HTMLElement): () => void {
    let last = -1;
    const report = () => {
        if (held) return;
        const height = Math.ceil(content.getBoundingClientRect().height);
        if (height === last) return;
        last = height;
        post({ type: RESIZE, id, height });
    };
    flush = report;
    const observer = new ResizeObserver(report);
    observer.observe(content);
    return () => {
        observer.disconnect();
        if (flush === report) flush = undefined;
    };
}

/**
 * Applies an example theme: its scheme on `<html>`, its name on `<body>`, where the example, the
 * popups portalled into `<body>` and popout windows (which mirror `<body>`) all find it.
 */
export function applyTheme(theme: ThemeName) {
    const scheme =
        THEMES.find((entry) => entry.name === theme)?.scheme ?? "light";
    const html = document.documentElement;
    // written on every switch, even when the scheme is unchanged (light → paper): a Fragiola chart
    // re-reads its colours when this attribute is written, and the example theme changed them
    html.dataset.theme = scheme;
    // the site sets the same scheme on the iframe: when the two differ, browsers paint an opaque
    // canvas under the example
    html.style.colorScheme = scheme;
    html.classList.toggle("dark", scheme === "dark");
    document.body.dataset.exampleTheme = theme;
}

/** Follows the site's theme messages; an unknown theme is ignored. Returns a cleanup. */
export function followTheme(): () => void {
    const onMessage = (event: MessageEvent) => {
        if (event.origin !== location.origin || event.source !== window.parent)
            return;
        const data = event.data as { type?: unknown; theme?: unknown } | null;
        if (data?.type === THEME && isThemeName(data.theme)) {
            applyTheme(data.theme);
        }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
}
