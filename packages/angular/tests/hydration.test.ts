// A server render taken over by the client with Angular's hydration (`provideClientHydration`).
// A collection's views are root views of their own (`SlotViews`, D11) whose elements sit before
// the template's anchor, which Angular's hydration does not know about: it cannot hydrate the
// calendar's markup. The calendar's component goes under `ngSkipHydration`: the client renders it
// again, in place of the server's markup, with no mismatch.
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
    type BootstrapContext,
    bootstrapApplication,
    provideClientHydration,
} from "@angular/platform-browser";
import {
    provideServerRendering,
    renderApplication,
} from "@angular/platform-server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CALENDAR } from "../src/public-api";
import { modelOf } from "./calendar";

@Component({
    selector: "month-calendar",
    imports: [CALENDAR],
    template: `
        <div [calendarRoot]="model">
            <div calendarDayGrid>
                <ng-template calendarWeeks let-week>
                    <div [calendarWeek]="week">
                        <ng-template calendarDays let-day>
                            <div [calendarDay]="day">{{ day.date }}</div>
                        </ng-template>
                    </div>
                </ng-template>
            </div>
        </div>
    `,
})
class MonthCalendar {
    readonly model = modelOf([], {
        view: { type: "month", anchorDate: "2026-11-26" },
    });
}

@Component({
    selector: "app-root",
    imports: [MonthCalendar],
    template: `<h1>Team</h1><month-calendar ngSkipHydration />`,
})
class SkippingApp {}

@Component({
    selector: "app-root",
    imports: [MonthCalendar],
    template: `<h1>Team</h1><month-calendar />`,
})
class HydratingApp {}

/** The server's markup of `app`, put in the document as a server-rendered page would be. */
async function serverRender(app: typeof SkippingApp): Promise<void> {
    const html = await renderApplication(
        (context: BootstrapContext) =>
            bootstrapApplication(
                app,
                {
                    providers: [
                        provideZonelessChangeDetection(),
                        provideServerRendering(),
                        provideClientHydration(),
                    ],
                },
                context,
            ),
        {
            document:
                "<!doctype html><html><body><app-root></app-root></body></html>",
            url: "/",
        },
    );
    document.body.innerHTML =
        /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
}

/** Bootstraps `app` over the server's markup with hydration; returns what Angular reported. */
async function hydrate(app: typeof SkippingApp): Promise<string[]> {
    const reported: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
        reported.push(args.map(String).join(" "));
    });
    try {
        const ref = await bootstrapApplication(app, {
            providers: [
                provideZonelessChangeDetection(),
                provideClientHydration(),
            ],
        });
        await ref.whenStable();
        ref.destroy();
    } catch (error) {
        reported.push(String(error));
    }
    return reported;
}

describe("a server render hydrated by the client", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = "";
    });

    it("renders the calendar again under ngSkipHydration: no mismatch, one grid", async () => {
        await serverRender(SkippingApp);
        expect(
            document.querySelectorAll('[data-calendar-part="week"]'),
        ).toHaveLength(6);
        const reported: string[] = [];
        vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
            reported.push(args.map(String).join(" "));
        });
        const ref = await bootstrapApplication(SkippingApp, {
            providers: [
                provideZonelessChangeDetection(),
                provideClientHydration(),
            ],
        });
        await ref.whenStable();
        expect(reported).toEqual([]);
        // the client's grid in place of the server's, not beside it
        expect(
            document.querySelectorAll('[data-calendar-part="week"]'),
        ).toHaveLength(6);
        expect(
            document.querySelectorAll('[data-calendar-part="day"]'),
        ).toHaveLength(42);
        ref.destroy();
    });

    it("cannot be hydrated in place (hence ngSkipHydration): Angular reports a mismatch", async () => {
        await serverRender(HydratingApp);
        const reported = await hydrate(HydratingApp);
        expect(reported.join("\n")).toMatch(
            /Expecting instance of DOM Element|NG0500|mismatch/i,
        );
    });
});
