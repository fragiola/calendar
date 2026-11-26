import type { CalendarModel } from "@fragiola/calendar-vue";
import type { EventSourcesFeature } from "@fragiola/calendar-vue/event-sources";
import { onBeforeUnmount, onMounted } from "vue";
import type { Types } from "../_kit/data";
import { fetchEvents } from "../_kit/fake-server";

/** Fetches the days the view shows and nobody fetched yet, whenever the model changes. */
export function useFetchMissing(
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
                    // aborted (the example unmounted) or failed: fetch it again later
                    model.run("event-sources.set-loading", {
                        sourceId,
                        range,
                        loading: false,
                    });
                },
            );
        }
    };
    onMounted(() => {
        fetchMissing();
        stop = model.subscribe(fetchMissing);
    });
    onBeforeUnmount(() => {
        stop?.();
        controller.abort();
    });
}
