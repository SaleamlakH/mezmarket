/**
 * Adds the unit's name to a line error when the message does not already carry
 * it. A unit the server cannot resolve still has a name in the client catalog.
 */
export function formatLineError(unitName: string | undefined, message: string): string {
  if (!unitName || message.includes(unitName)) return message;
  return `${unitName}: ${message}`;
}
