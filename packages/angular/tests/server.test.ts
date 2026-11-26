// @vitest-environment node
// A server render (`@angular/platform-server`, zoneless): the model's state with the model's
// attributes (`partAttributes`, the tab stop where the model puts it), no engine, no subscription
// and no timer; a controlled input that differs from a given model is not applied on the server
// (the client applies it once rendered, after hydrating the model's state).
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
    type BootstrapContext,
    bootstrapApplication,
} from "@angular/platform-browser";
import {
    provideServerRendering,
    renderApplication,
} from "@angular/platform-server";
import { describe, expect, it } from "vitest";
import { CALENDAR } from "../src/public-api";
import { modelOf, TestCalendar, timed } from "./calendar";

describe("a server render", () => {
    it("shows the model's state and attributes, with a controlled date left to the client", async () => {
        const model = modelOf([timed("t", "09:00", "10:00")], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        const subscribe = model.subscribe;
        let subscriptions = 0;
        Object.defineProperty(model, "subscribe", {
            value: (listener: Parameters<typeof subscribe>[0]) => {
                subscriptions++;
                return subscribe(listener);
            },
        });
        @Component({
            selector: "app-root",
            imports: [TestCalendar],
            template: `<test-calendar [model]="model" />`,
        })
        class App {
            readonly model = model;
        }
        const html = await renderApplication(
            (context: BootstrapContext) =>
                bootstrapApplication(
                    App,
                    {
                        providers: [
                            provideZonelessChangeDetection(),
                            provideServerRendering(),
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
        expect(html).toContain('data-calendar-part="root"');
        expect(html).toContain('data-view="week"');
        expect(html).toContain('data-calendar-part="time-event"');
        // one tab stop, where the model puts it: today's first slot
        expect(html.match(/tabindex="0"/g)).toHaveLength(1);
        expect(html).toMatch(
            /data-calendar-part="slot"[^>]*data-date="2026-11-26"[^>]*data-time="00:00"[^>]*tabindex="0"/,
        );
        expect(subscriptions).toBe(0);
    });

    it("leaves a controlled date that differs from the given model to the client", async () => {
        const model = modelOf([], {
            view: { type: "week", anchorDate: "2026-11-26" },
        });
        @Component({
            selector: "app-root",
            imports: [CALENDAR],
            template: `
                <div [calendarRoot]="model" date="2027-01-15">
                    <div calendarTimeGrid>
                        <div calendarColumnHeaders>
                            <ng-template calendarColumnHeadersItem let-date>
                                <div [calendarColumnHeader]="date"></div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            `,
        })
        class App {
            readonly model = model;
        }
        const html = await renderApplication(
            (context: BootstrapContext) =>
                bootstrapApplication(
                    App,
                    {
                        providers: [
                            provideZonelessChangeDetection(),
                            provideServerRendering(),
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
        expect(html).toContain('data-date="2026-11-26"');
        expect(html).not.toContain('data-date="2027-01-15"');
        expect(model.state.view.anchorDate).toBe("2026-11-26");
    });
});
