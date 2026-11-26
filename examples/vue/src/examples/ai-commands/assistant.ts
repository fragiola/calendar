// The scripted assistant: what a language model would answer to "plan my week", written out. Each
// step is a tool call, `{ command, payload }`, exactly as a model sends it: the app hands it to
// `model.dispatch`, which validates it against the command's JSON Schema like any untrusted input.
// One step is wrong on purpose (an event resized to end before it starts): it is refused, not
// repaired, and the assistant would read the error and try again.
import { at, weekday } from "../_kit/data";

/** A tool call: a command of `model.get("commands")` and its payload. */
export interface ToolCall {
    command: string;
    payload: Record<string, unknown>;
}

/** The assistant's plan for this week. */
export function planMyWeek(): ToolCall[] {
    return [
        {
            command: "event.add",
            payload: {
                title: "Focus: write the spec",
                kind: "focus",
                calendarId: "ada",
                start: at(weekday(3), "08:00"),
                end: at(weekday(3), "09:30"),
                allDay: false,
            },
        },
        {
            command: "event.move",
            payload: { eventId: "retro", delta: { minutes: -60 } },
        },
        {
            command: "event.resize",
            payload: {
                eventId: "design",
                edge: "end",
                to: at(weekday(2), "13:00"),
            },
        },
        {
            command: "event.add",
            payload: {
                title: "Prepare the demo",
                kind: "focus",
                calendarId: "grace",
                start: at(weekday(4), "13:00"),
                end: at(weekday(4), "14:30"),
                allDay: false,
            },
        },
        {
            command: "event.remove",
            payload: { eventId: "sync" },
        },
    ];
}
