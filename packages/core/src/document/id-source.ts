// From Tree (fragiola/tree, packages/core/src/state/ids.ts), same author and licence; the calendar
// names what the id is for (an event or a calendar).

/**
 * Generates the id of an event or a calendar given without one (at load, `event.add`,
 * `calendar.add`). The model skips an id already in use and asks again. No global `crypto` (D3).
 */
export type CreateId = (kind: "event" | "calendar") => string;

/** How many times a custom generator is asked before the default takes over. */
const ATTEMPTS = 100;

/**
 * The ids of one model. The default generator is deterministic: `` `event-${n}` ``,
 * `` `calendar-${n}` ``. A dry run (`can`, `check`) draws from a copy; the ids a custom generator
 * gave it are kept for the next runs, so `check` and the `run` after it name the same id.
 */
export class IdSource {
    private counter = 0;
    private readonly custom: CreateId | undefined;
    /** a custom generator's ids a dry run drew, by kind, for the next draws */
    private reserved: { event: string[]; calendar: string[] } = {
        event: [],
        calendar: [],
    };
    /** the source a dry run's copy reserves its custom ids in */
    private owner: IdSource | undefined;

    constructor(createId?: CreateId) {
        this.custom = createId;
    }

    /** A copy with the same counter: a dry run draws ids from it, leaving this one as it was. */
    clone(): IdSource {
        const copy = new IdSource(this.custom);
        copy.counter = this.counter;
        copy.reserved = {
            event: [...this.reserved.event],
            calendar: [...this.reserved.calendar],
        };
        copy.owner = this.owner ?? this;
        return copy;
    }

    /** The custom generator's next id of `kind`: one reserved first. */
    private draw(kind: "event" | "calendar"): string {
        const reserved = this.reserved[kind].shift();
        if (reserved !== undefined) return reserved;
        const id = this.custom?.(kind) ?? "";
        this.owner?.reserved[kind].push(id);
        return id;
    }

    /** A fresh id of `kind`, for which `isUsed` is false. */
    next(kind: "event" | "calendar", isUsed: (id: string) => boolean): string {
        if (this.custom) {
            for (let i = 0; i < ATTEMPTS; i++) {
                const id = this.draw(kind);
                if (typeof id === "string" && id !== "" && !isUsed(id)) {
                    return id;
                }
            }
        }
        for (;;) {
            this.counter += 1;
            const id = `${kind}-${this.counter}`;
            if (!isUsed(id)) {
                return id;
            }
        }
    }
}
