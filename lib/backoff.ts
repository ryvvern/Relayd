const SECOND = 1000;
const MINUTE = 60 * SECOND;

// attemptNumber refers to the attempt that just failed. For example,
// computeNextRetry(1) means attempt #1 just failed, and the returned delay
// is the wait before attempt #2.
const RETRY_SCHEDULE_MS: Record<number, number> = {
  1: 10 * SECOND,
  2: 1 * MINUTE,
  3: 5 * MINUTE,
  4: 30 * MINUTE,
};

const MAX_ATTEMPTS = 5;

export function computeNextRetry(
  attemptNumber: number
): { delayMs: number } | { deadLetter: true } {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > MAX_ATTEMPTS) {
    throw new Error(
      `Invalid attemptNumber: ${attemptNumber}. Expected an integer between 1 and ${MAX_ATTEMPTS}.`
    );
  }

  if (attemptNumber === MAX_ATTEMPTS) {
    return { deadLetter: true };
  }

  return { delayMs: RETRY_SCHEDULE_MS[attemptNumber] };
}
