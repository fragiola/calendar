import { batch } from "./batch";
import {
    calendarAdd,
    calendarRemove,
    calendarSetVisible,
    calendarUpdate,
} from "./calendar";
import type { CommandDefinition } from "./define";
import {
    eventAdd,
    eventMove,
    eventRemove,
    eventResize,
    eventSetAll,
    eventSetData,
    eventSetFlags,
    eventUpdate,
} from "./event";
import { settingsSet } from "./settings";
import type { CommandName } from "./types";
import { viewGoTo, viewNext, viewPrevious, viewSet, viewToday } from "./view";

/**
 * Every command of the core, in the order `model.get("commands")` lists them (an installed
 * feature's follow). Each definition keeps its schemas' literal types (the type tests read them);
 * the list erases them to `CommandDefinition` once. From Tree (fragiola/tree,
 * packages/core/src/commands/catalogue.ts), same author and licence.
 */
export const COMMANDS: readonly CommandDefinition[] = [
    eventAdd,
    eventUpdate,
    eventMove,
    eventResize,
    eventRemove,
    eventSetData,
    eventSetFlags,
    eventSetAll,
    calendarAdd,
    calendarUpdate,
    calendarRemove,
    calendarSetVisible,
    settingsSet,
    viewSet,
    viewGoTo,
    viewNext,
    viewPrevious,
    viewToday,
    batch,
] as const satisfies readonly {
    readonly name: CommandName;
    readonly transient: boolean;
    readonly reduce: (...args: never[]) => unknown;
}[] as readonly unknown[] as readonly CommandDefinition[];

/** The core's command definitions by name. */
export const COMMAND_DEFINITIONS: ReadonlyMap<string, CommandDefinition> =
    new Map(COMMANDS.map((definition) => [definition.name, definition]));
