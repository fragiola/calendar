declare const instantBrand: unique symbol;

/**
 * An exact point in time: epoch milliseconds (UTC), branded so a wall-clock number or a duration
 * cannot pass for one. `Date.now()` becomes one through `instant()`.
 */
export type Instant = number & { readonly [instantBrand]: true };

/** Epoch milliseconds as an `Instant`; a non-integer or a non-finite number is a `RangeError`. */
export function instant(epochMilliseconds: number): Instant {
    if (!Number.isSafeInteger(epochMilliseconds)) {
        throw new RangeError(
            `${epochMilliseconds} is not an instant (integer epoch milliseconds)`,
        );
    }
    return epochMilliseconds as Instant;
}
