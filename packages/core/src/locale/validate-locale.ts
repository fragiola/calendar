// A locale's canonical form is kept per name: settings are validated on every `settings.set`.
import { invalid, type ValidationResult } from "../document/validation-issue";

const canonicals = new Map<string, string | null>();
/** Names kept before the cache starts over. */
const MAX_NAMES = 1000;

function canonicalOf(value: string): string | null {
    let canonical = canonicals.get(value);
    if (canonical === undefined) {
        try {
            canonical = Intl.getCanonicalLocales(value)[0] ?? null;
        } catch {
            canonical = null;
        }
        if (canonicals.size >= MAX_NAMES) canonicals.clear();
        canonicals.set(value, canonical);
    }
    return canonical;
}

/** A BCP 47 locale in its canonical form (`"pt-br"` → `"pt-BR"`), or the issue at `path`. */
export function validateLocale(
    value: unknown,
    path = "",
): ValidationResult<string> {
    if (typeof value !== "string" || value === "") {
        return invalid(path, 'expected a BCP 47 locale ("en-US")');
    }
    const canonical = canonicalOf(value);
    return canonical
        ? { ok: true, value: canonical }
        : invalid(path, `"${value}" is not a BCP 47 locale`);
}
