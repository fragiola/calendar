import { invalid, type ValidationResult } from "../document/validation-issue";

/** A BCP 47 locale in its canonical form (`"pt-br"` → `"pt-BR"`), or the issue at `path`. */
export function validateLocale(
    value: unknown,
    path = "",
): ValidationResult<string> {
    if (typeof value !== "string" || value === "") {
        return invalid(path, 'expected a BCP 47 locale ("en-US")');
    }
    try {
        const [canonical] = Intl.getCanonicalLocales(value);
        return canonical
            ? { ok: true, value: canonical }
            : invalid(path, `"${value}" is not a BCP 47 locale`);
    } catch {
        return invalid(path, `"${value}" is not a BCP 47 locale`);
    }
}
