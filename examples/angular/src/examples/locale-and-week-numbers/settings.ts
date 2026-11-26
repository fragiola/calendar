import { Component, signal } from "@angular/core";
import { injectCalendar } from "@fragiola/calendar-angular";
import { SEGMENTED_CONTROL } from "#/components/ui/segmented-control";
import type { Types } from "../_kit/data";

const LOCALES = [
    { locale: "en-US", label: "English (US)" },
    { locale: "en-GB", label: "English (UK)" },
    { locale: "de-DE", label: "Deutsch" },
    { locale: "ja-JP", label: "日本語" },
] as const;

const RULES = [
    { rule: "locale", label: "Locale weeks" },
    { rule: "iso", label: "ISO weeks" },
] as const;

// The locale and the week-number rule: app state that each runs one `settings.set`.
@Component({
    selector: "[localeAndWeekNumbersSettings]",
    imports: [SEGMENTED_CONTROL],
    template: `
        <div kitSegmentedControl aria-label="Locale" [value]="locale()" (valueChange)="setLocale($event)">
            @for (option of LOCALES; track option.locale) {
                <button kitSegmentedControlItem [value]="option.locale">{{ option.label }}</button>
            }
        </div>
        <div kitSegmentedControl aria-label="Week numbers" [value]="rule()" (valueChange)="setRule($event)">
            @for (option of RULES; track option.rule) {
                <button kitSegmentedControlItem [value]="option.rule">{{ option.label }}</button>
            }
        </div>
    `,
})
export class Settings {
    protected readonly LOCALES = LOCALES;
    protected readonly RULES = RULES;
    private readonly model = injectCalendar<Types>().model;
    protected readonly locale = signal<string | null>(
        this.model().state.settings.locale,
    );
    protected readonly rule = signal<string | null>(
        this.model().state.settings.weekNumbers,
    );

    protected setLocale(next: string | null) {
        if (!next) return;
        this.locale.set(next);
        this.model().run("settings.set", { settings: { locale: next } });
    }

    protected setRule(next: string | null) {
        if (next !== "iso" && next !== "locale") return;
        this.rule.set(next);
        this.model().run("settings.set", { settings: { weekNumbers: next } });
    }
}
