// Type fixtures (compiled by `pnpm typecheck`, never run): each command's hand-written JSON Schema,
// read back as a type with FromSchema, is the command's payload type (and result type), and the
// document schema is `CalendarDocument`. A schema that drifts from its type fails the typecheck.
// Shaped like Tree's (fragiola/tree, packages/core/tests/types/schemas.ts), same author and licence.
import type {
    calendarAdd,
    calendarRemove,
    calendarSetVisible,
    calendarUpdate,
} from "../../src/commands/calendar";
import type {
    eventAdd,
    eventMove,
    eventRemove,
    eventResize,
    eventSetAll,
    eventSetData,
    eventSetFlags,
    eventUpdate,
} from "../../src/commands/event";
import type { settingsSet } from "../../src/commands/settings";
import type {
    CommandName,
    PayloadOf,
    ResultOf,
} from "../../src/commands/types";
import type {
    viewGoTo,
    viewNext,
    viewPrevious,
    viewSet,
    viewToday,
} from "../../src/commands/view";
import type { CalendarDocument } from "../../src/document/calendar-document";
import type { calendarSchema } from "../../src/document/calendar-schema";
import type { AnyTypes } from "../../src/document/calendar-types";
import type { FromSchema } from "../../src/schema/from-schema";

/** Mutually assignable, with the same keys. */
type Same<A, B> = [A] extends [B]
    ? [B] extends [A]
        ? [keyof A] extends [keyof B]
            ? [keyof B] extends [keyof A]
                ? true
                : false
            : false
        : false
    : false;

type Check<
    C extends CommandName,
    D extends { payloadSchema: unknown; resultSchema: unknown },
> = [
    Same<FromSchema<D["payloadSchema"]>, PayloadOf<AnyTypes, C>>,
    Same<FromSchema<D["resultSchema"]>, ResultOf<AnyTypes, C>>,
];

/** Compiles only when every entry is `[true, true]`. `batch` is checked by its own tests. */
export type SchemasMatchTypes = [
    Check<"event.add", typeof eventAdd>,
    Check<"event.update", typeof eventUpdate>,
    Check<"event.move", typeof eventMove>,
    Check<"event.resize", typeof eventResize>,
    Check<"event.remove", typeof eventRemove>,
    Check<"event.set-data", typeof eventSetData>,
    Check<"event.set-flags", typeof eventSetFlags>,
    Check<"event.set-all", typeof eventSetAll>,
    Check<"calendar.add", typeof calendarAdd>,
    Check<"calendar.update", typeof calendarUpdate>,
    Check<"calendar.remove", typeof calendarRemove>,
    Check<"calendar.set-visible", typeof calendarSetVisible>,
    Check<"settings.set", typeof settingsSet>,
    Check<"view.set", typeof viewSet>,
    Check<"view.go-to", typeof viewGoTo>,
    Check<"view.next", typeof viewNext>,
    Check<"view.previous", typeof viewPrevious>,
    Check<"view.today", typeof viewToday>,
] extends [true, true][]
    ? true
    : never;

export const schemasMatchTypes: SchemasMatchTypes = true;

/** The document schema is the document type. */
export const documentSchemaMatchesType: Same<
    FromSchema<typeof calendarSchema>,
    CalendarDocument<AnyTypes>
> = true;
