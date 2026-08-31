/**
 * Turn a caught value into something worth showing a user.
 *
 * Every store funnels failures through this so a failed request always produces
 * a message, and never a silently empty list that reads as "there is no data".
 * The fallback is what to say when the error carries nothing useful — write it
 * from the reader's side ("Attendance could not be loaded"), not the code's.
 */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}
