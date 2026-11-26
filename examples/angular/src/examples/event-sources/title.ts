import { Component } from "@angular/core";
import { injectCalendarTitle } from "@fragiola/calendar-angular";
import { text } from "../_kit/format";

// The view's title (its days, as `Intl` parts), on your heading: `<h2 eventSourcesTitle>`.
@Component({
    selector: "[eventSourcesTitle]",
    template: "{{ text(title()) }}",
})
export class Title {
    protected readonly text = text;
    protected readonly title = injectCalendarTitle();
}
