import { Calendar, createCalendarModel } from "@fragiola/calendar-react";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import "../../fixture/fixture.css";
import { NOW, Toolbar, timed, View } from "../../fixture/calendar";
import { useInspector } from "../../inspector/context";

// One event at 09:00 New York, shown in three display zones (`settings.set { timeZone }`): the
// instant stays, its wall clock moves. The DST week of 2026-11-01 is one Previous away.

const ZONES = ["America/New_York", "Europe/London", "Asia/Tokyo"] as const;

export default function DisplayZone() {
    const [model] = useState(() =>
        createCalendarModel(
            {
                version: 1,
                settings: { timeZone: "America/New_York", locale: "en-US" },
                events: [timed("standup", "2026-11-26", "09:00", "09:30")],
                view: { type: "week", anchorDate: "2026-11-26" },
            },
            { now: () => NOW },
        ),
    );
    useInspector(model);
    return (
        <div>
            <div>
                {ZONES.map((zone) => (
                    <Clickable.Button
                        key={zone}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            model.run("settings.set", {
                                settings: { timeZone: zone },
                            })
                        }
                    >
                        {zone}
                    </Clickable.Button>
                ))}
            </div>
            <Calendar.Root model={model} aria-label="Calendar">
                <Toolbar />
                <View parts={{}} />
            </Calendar.Root>
        </div>
    );
}
