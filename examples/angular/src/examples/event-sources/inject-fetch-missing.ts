import { afterNextRender, DestroyRef, inject } from "@angular/core";
import type { CalendarModel } from "@fragiola/calendar-angular";
import type { EventSourcesFeature } from "@fragiola/calendar-angular/event-sources";
import type { Types } from "../_kit/data";
import { fetchEvents } from "../_kit/fake-server";

/**
 * Fetches the days the view shows and nobody fetched yet, whenever the model changes. Call it in
 * an injection context (a component's constructor): it starts once the component has rendered.
 */
export function injectFetchMissing(
    model: CalendarModel<Types, readonly [EventSourcesFeature]>,
) {
    const controller = new AbortController();
    let stop: (() => void) | undefined;
    const fetchMissing = () => {
        for (const { sourceId, range } of model.get("ranges-to-fetch", {})) {
            model.run("event-sources.set-loading", {
                sourceId,
                range,
                loading: true,
            });
            fetchEvents(sourceId, range, controller.signal).then(
                (events) => {
                    model.run("event-sources.receive", {
                        sourceId,
                        range,
                        events,
                    });
                    model.run("event-sources.set-loading", {
                        sourceId,
                        range,
                        loading: false,
                    });
                },
                () => {
                    // aborted (the example was destroyed) or failed: fetch it again later
                    model.run("event-sources.set-loading", {
                        sourceId,
                        range,
                        loading: false,
                    });
                },
            );
        }
    };
    afterNextRender(() => {
        fetchMissing();
        stop = model.subscribe(fetchMissing);
    });
    inject(DestroyRef).onDestroy(() => {
        stop?.();
        controller.abort();
    });
}
