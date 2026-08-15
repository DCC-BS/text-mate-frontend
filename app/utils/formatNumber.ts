/**
 * Formats a number with an apostrophe (') as a thousands separator.
 * For example: 100000 -> "100'000", 1000 -> "1'000", 0 -> "0".
 *
 * @param value - The number to format.
 * @returns The formatted number string.
 */
export function formatNumber(value: number): string {
    const parts = value.toString().split(".");
    const integerPart = parts[0] ?? "";
    const isNegative = integerPart.startsWith("-");
    const digits = isNegative ? integerPart.slice(1) : integerPart;

    const formattedDigits = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    const formattedInteger = isNegative
        ? `-${formattedDigits}`
        : formattedDigits;

    return parts.length > 1
        ? `${formattedInteger}.${parts[1]}`
        : formattedInteger;
}
