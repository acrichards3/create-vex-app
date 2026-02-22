export type TryCatchResult<T> = [T, null] | [null, Error];

/**
 * A clean alternative to try/catch blocks that works with tuples.
 * @param fn - The function to try to execute.
 * @returns A tuple containing the result of the function and the error if it occurred.
 */
export const tryCatch = <T>(fn: () => T): TryCatchResult<T> => {
  try {
    return [fn(), null];
  } catch (error) {
    if (error instanceof Error) {
      return [null, error];
    }
    return [null, new Error(String(error))];
  }
};

/**
 * A clean alternative to try/catch blocks that works with async functions and tuples.
 * @param fn - The async function to try to execute.
 * @returns A tuple containing the result of the async function and the error if it occurred.
 */
export const tryCatchAsync = async <T>(fn: () => Promise<T>): Promise<TryCatchResult<T>> => {
  try {
    return [await fn(), null];
  } catch (error) {
    if (error instanceof Error) {
      return [null, error];
    }
    return [null, new Error(String(error))];
  }
};
