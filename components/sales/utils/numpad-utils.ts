/**
 * Pure numpad string manipulation functions — no side effects, no React.
 */

/**
 * Append a digit to a quantity numpad string.
 * Leading zero is replaced; result is capped at 6 chars.
 */
export function appendDigit(current: string, digit: string): string {
  const next = current === "0" ? digit : `${current}${digit}`;
  return next.slice(0, 6);
}

/**
 * Append a decimal point to an amount numpad string.
 * No-op if the string already contains ".".
 */
export function appendDecimal(current: string): string {
  if (current.includes(".")) {
    return current;
  }
  return current ? `${current}.` : "0.";
}

/**
 * Clear the numpad value to an empty string.
 */
export function clearValue(): string {
  return "";
}

/**
 * Remove the last character from the numpad string.
 */
export function backspaceValue(current: string): string {
  return current.slice(0, -1);
}
