import {
    type CDPSession,
    expect,
    type Frame,
    type Locator,
    type Page,
    test,
} from "@playwright/test";
import {
    column,
    day,
    eventById,
    FRAMEWORK,
    hostedFrame,
    openExample,
    openHosted,
    pointIn,
    scrollTo,
    slot,
} from "./helpers";

// The examples' performance budgets (Epic #27), on a CPU slowed four times through the DevTools
// protocol (Chromium only: the `perf` project, config.ts, runs this file alone after every other
// spec). A week and a month drag of drag-and-resize: no long task over 50 ms while it moves, a
// frame's p95 at most 20 ms (60 fps), the dropped event painted within 50 ms of the release. A
// drop of recurring-events' standup: its scope dialog visible within 100 ms, 150 ms in a host
// page that promotes the frame over its page (serve.ts, `promote=1`). Next in week: the next
// week painted within 50 ms of the click.
//
// Each measure is the median of 3 runs, each on a fresh page. In CI every budget is doubled: a
// shared runner is slower and noisier than a developer's machine (AGENTS.md records both).

const CI = Boolean(process.env.CI);
const SCALE = CI ? 2 : 1;
/** The budgets, in milliseconds (doubled in CI). */
const BUDGET = {
    longTask: 50 * SCALE,
    frameP95: 20 * SCALE,
    dropPainted: 50 * SCALE,
    dialogVisible: 100 * SCALE,
    dialogVisibleHosted: 150 * SCALE,
    weekNext: 50 * SCALE,
};
const RUNS = 3;
/** The CPU slowdown: a mid-range phone's, about. */
const THROTTLE = 4;
/** Pointer moves of a drag, one per frame. */
const MOVES = 30;
/** The moves after which the drag is under way: past its threshold, its preview shown. */
const STARTED = 3;

/** What a run measured, from the page's own clock. */
interface Probe {
    /** frame durations while the pointer moved */
    frames: number[];
    /** long tasks while the pointer moved */
    longTasks: number[];
    /** from the release to the frame that shows the drop's target, or null */
    painted: number | null;
    /** the frame's viewport width when `watch` was first seen */
    paintedWidth: number | null;
}

test.skip(
    ({ browserName }) => browserName !== "chromium",
    "the CPU throttle is a DevTools protocol command",
);

// The probe, installed in every frame before it loads: the long tasks from the press, the frames
// once the drag is under way (its start, which measures the grid, is a long task's concern), and
// from the pointer's release (its capture listener) the first frame in which `watch`
// matches a visible element (a box and an opacity).
function probe() {
    const state = {
        recording: false,
        moving: false,
        frames: [] as number[],
        longTasks: [] as number[],
        watch: null as string | null,
        released: null as number | null,
        painted: null as number | null,
        paintedWidth: null as number | null,
        // the browser's own clock, frame and timer, kept before the fixed clock (installed after
        // this script) replaces them with its own, which run frame callbacks on a 16 ms grid
        now: performance.now.bind(performance),
        frame: requestAnimationFrame.bind(window),
        timeout: setTimeout.bind(window),
    };
    Object.assign(window, { __perf: state });
    // shown: a box, and an opacity through its ancestors (a held overlay's portal is transparent)
    const seen = (element: Element) => {
        const box = element.getBoundingClientRect();
        let opacity = 1;
        for (let at: Element | null = element; at; at = at.parentElement) {
            opacity *= Number(getComputedStyle(at).opacity);
        }
        return box.width > 0 && box.height > 0 && opacity > 0.05;
    };
    let last = 0;
    const frame = (time: number) => {
        if (state.moving && last) state.frames.push(time - last);
        last = time;
        if (state.released !== null && state.painted === null && state.watch) {
            const element = document.querySelector(state.watch);
            if (element && seen(element)) {
                state.painted = performance.now() - state.released;
                state.paintedWidth = innerWidth;
            }
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    new PerformanceObserver((list) => {
        if (!state.recording) return;
        for (const entry of list.getEntries()) {
            state.longTasks.push(entry.duration);
        }
    }).observe({ type: "longtask" });
    addEventListener(
        "pointerup",
        () => {
            state.recording = false;
            state.moving = false;
            state.released = performance.now();
        },
        true,
    );
}

const readProbe = (frame: Frame): Promise<Probe> =>
    frame.evaluate(() => {
        const { frames, longTasks, painted, paintedWidth } = (
            window as unknown as { __perf: Probe }
        ).__perf;
        return { frames, longTasks, painted, paintedWidth };
    });

/**
 * The pause between two pointer moves: a 60 Hz mouse's. Timed in the test, not in the page, so
 * the page's main thread does nothing for it (a timer, not a wait for a state: `settled` is that).
 */
const pace = () => new Promise<void>((resolve) => setTimeout(resolve, 16));

const throttle = (cdp: CDPSession, rate: number) =>
    cdp.send("Emulation.setCPUThrottlingRate", { rate });

/**
 * Drags from a point to another in {@link MOVES} moves, one per frame, recording the long tasks
 * from the press and the frames from the {@link STARTED}th move, then releases and waits until the probe saw `watch` painted.
 */
async function measureDrag(
    page: Page,
    cdp: CDPSession,
    frame: Frame,
    from: { x: number; y: number },
    to: { x: number; y: number },
    watch: string,
): Promise<Probe> {
    await frame.evaluate((selector) => {
        const state = (window as unknown as { __perf: Record<string, unknown> })
            .__perf;
        Object.assign(state, { watch: selector, frames: [], longTasks: [] });
    }, watch);
    // the page done with its load (its chunks, its first measures) before the clock starts
    await frame.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestIdleCallback(() => resolve(), { timeout: 1000 }),
            ),
    );
    await throttle(cdp, THROTTLE);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await frame.evaluate(() => {
        (
            window as unknown as { __perf: { recording: boolean } }
        ).__perf.recording = true;
    });
    for (let move = 1; move <= MOVES; move++) {
        const k = move / MOVES;
        await page.mouse.move(
            from.x + (to.x - from.x) * k,
            from.y + (to.y - from.y) * k,
        );
        await pace();
        if (move === STARTED) {
            await frame.evaluate(() => {
                (
                    window as unknown as { __perf: { moving: boolean } }
                ).__perf.moving = true;
            });
        }
    }
    await page.mouse.up();
    await expect
        .poll(async () => (await readProbe(frame)).painted, {
            message: `${watch} painted after the drop`,
        })
        .not.toBeNull();
    const result = await readProbe(frame);
    // the next run loads at full speed
    await throttle(cdp, 1);
    return result;
}

const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)] ?? Number.NaN;
};

const p95 = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return (
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ??
        0
    );
};

/**
 * Runs a measure {@link RUNS} times, each on a fresh load of the page (the probe installed in each
 * of its frames before they load), and returns the runs.
 */
async function runs(
    page: Page,
    measure: (cdp: CDPSession) => Promise<Probe>,
): Promise<Probe[]> {
    await page.addInitScript(probe);
    const cdp = await page.context().newCDPSession(page);
    const all: Probe[] = [];
    for (let run = 0; run < RUNS; run++) all.push(await measure(cdp));
    return all;
}

/** Records a test's medians: an annotation (the HTML report) and a line of the run's output. */
function record(report: Record<string, number>) {
    const description = JSON.stringify(report);
    test.info().annotations.push({ type: "perf", description });
    console.log(`perf (${FRAMEWORK}) ${test.info().title}: ${description}`);
}

/** The drag budgets: medians of the runs' long tasks, frame p95 and painted drop. */
function expectDragBudgets(all: Probe[]) {
    const report = {
        longestTask: median(all.map((run) => Math.max(0, ...run.longTasks))),
        frameP95: median(all.map((run) => p95(run.frames))),
        dropPainted: median(all.map((run) => run.painted ?? Number.NaN)),
    };
    record(report);
    expect(
        report.longestTask,
        "the longest task during the drag",
    ).toBeLessThanOrEqual(BUDGET.longTask);
    expect(
        report.frameP95,
        "a frame's p95 during the drag",
    ).toBeLessThanOrEqual(BUDGET.frameP95);
    expect(report.dropPainted, "the drop painted").toBeLessThanOrEqual(
        BUDGET.dropPainted,
    );
}

test.describe.configure({ mode: "serial" });

test("a week drag runs at 60 fps and its drop paints within 50 ms", async ({
    page,
}) => {
    const all = await runs(page, async (cdp) => {
        const stage = await openExample(page, "drag-and-resize");
        await scrollTo(stage, "08:00");
        return measureDrag(
            page,
            cdp,
            page.mainFrame(),
            await pointIn(eventById(stage, "planning"), 0.5, 0.2),
            await pointIn(slot(stage, "2026-11-25", "11:00"), 0.5, 0.2),
            '[data-calendar-part="column"][data-date="2026-11-25"] [data-event-id="planning"]',
        );
    });
    expectDragBudgets(all);
});

test("a month drag runs at 60 fps and its drop paints within 50 ms", async ({
    page,
}) => {
    const all = await runs(page, async (cdp) => {
        const stage = await openExample(page, "drag-and-resize");
        await stage.getByRole("button", { name: "Month" }).click();
        await expect(day(stage, "2026-12-09")).toBeVisible();
        return measureDrag(
            page,
            cdp,
            page.mainFrame(),
            await pointIn(eventById(stage, "offsite").first(), 0.2),
            await pointIn(day(stage, "2026-12-09"), 0.5, 0.7),
            '[data-calendar-part="day"][data-date="2026-12-09"] [data-event-id="offsite"], [data-calendar-part="week"] [data-event-id="offsite"][data-continues-before]',
        );
    });
    expectDragBudgets(all);
});

/** Drops Wednesday's standup at 11:00 and measures until its scope dialog is visible. */
async function dropStandup(
    page: Page,
    cdp: CDPSession,
    stage: Locator,
    frame: Frame,
) {
    await scrollTo(stage, "08:00");
    const standup = eventById(column(stage, "2026-11-25"), "standup");
    return measureDrag(
        page,
        cdp,
        frame,
        await pointIn(standup, 0.5, 0.5),
        await pointIn(slot(stage, "2026-11-25", "11:00"), 0.5, 0.5),
        '[role="dialog"]',
    );
}

test("a recurring drop shows its scope dialog within 100 ms", async ({
    page,
}) => {
    const all = await runs(page, async (cdp) => {
        const stage = await openExample(page, "recurring-events");
        return dropStandup(page, cdp, stage, page.mainFrame());
    });
    const visible = median(all.map((run) => run.painted ?? Number.NaN));
    record({ dialogVisible: visible });
    expect(visible, "the scope dialog visible").toBeLessThanOrEqual(
        BUDGET.dialogVisible,
    );
});

test("in a promoting host, the scope dialog is visible within 150 ms", async ({
    page,
}) => {
    const all = await runs(page, async (cdp) => {
        const frame = await openHosted(page, {
            id: "recurring-events",
            promote: "1",
        });
        const stage = frame.locator("body");
        const result = await dropStandup(page, cdp, stage, hostedFrame(page));
        // the frame covers the page while the dialog is open, and the dialog was first seen there:
        // held while the frame grew, its opening never cut by the resize
        await expect(page.getByTestId("frame")).toHaveAttribute(
            "data-promoted",
            "",
        );
        expect(
            result.paintedWidth,
            "the frame's width when the dialog showed",
        ).toBe(page.viewportSize()?.width);
        return result;
    });
    const visible = median(all.map((run) => run.painted ?? Number.NaN));
    record({ dialogVisibleHosted: visible });
    expect(visible, "the scope dialog visible").toBeLessThanOrEqual(
        BUDGET.dialogVisibleHosted,
    );
});

/** Clicks on Next a week view shows. */
const NEXTS = 6;

test("Next in a week paints the next week within 50 ms", async ({ page }) => {
    await page.addInitScript(probe);
    const cdp = await page.context().newCDPSession(page);
    const all: number[] = [];
    for (let run = 0; run < RUNS; run++) {
        const stage = await openExample(page, "week");
        const first = stage
            .locator('[data-calendar-part="column-header"]')
            .first();
        const start = await first.getAttribute("data-date");
        await page
            .mainFrame()
            .evaluate(
                () =>
                    new Promise<void>((resolve) =>
                        requestIdleCallback(() => resolve(), { timeout: 1000 }),
                    ),
            );
        await throttle(cdp, THROTTLE);
        const clicks: number[] = [];
        for (let click = 0; click < NEXTS; click++) {
            // from the click to the end of the frame that shows the next week (its paint done)
            clicks.push(
                await page.mainFrame().evaluate(
                    () =>
                        new Promise<number>((resolve) => {
                            const { now, frame, timeout } = (
                                window as unknown as {
                                    __perf: {
                                        now: () => number;
                                        frame: typeof requestAnimationFrame;
                                        timeout: typeof setTimeout;
                                    };
                                }
                            ).__perf;
                            const next = document.querySelector<HTMLElement>(
                                '[data-calendar-part="next"]',
                            );
                            const clicked = now();
                            next?.click();
                            frame(() =>
                                timeout(() => resolve(now() - clicked)),
                            );
                        }),
                ),
            );
            await page.waitForTimeout(100);
        }
        await throttle(cdp, 1);
        // six weeks on
        const shown = new Date(`${start}T12:00:00Z`);
        shown.setUTCDate(shown.getUTCDate() + 7 * NEXTS);
        await expect(first).toHaveAttribute(
            "data-date",
            shown.toISOString().slice(0, 10),
        );
        all.push(median(clicks));
    }
    const painted = Math.round(median(all) * 10) / 10;
    record({ weekNext: painted });
    expect(painted, "the next week painted").toBeLessThanOrEqual(
        BUDGET.weekNext,
    );
});
