/**
 * Check if a key is a key of an object
 * @param x - Object to check
 * @param k - Key to check
 * @returns - True if key is a key of the object
 */
export const isKey = <T extends object>(x: T, k: PropertyKey): k is keyof T => k in x;

/**
 * Type-safe version of Object.keys()
 * @param obj - Object to get keys from
 * @returns - Typed array of keys instead of just string[]
 */
export const objectKeys = <T extends object>(obj: T) => {
  return Object.keys(obj).filter((k) => isKey(obj, k));
};

/**
 * Typed version of Object.fromEntries()
 * @param entries - Iterable of key-value pairs
 * @returns - Object with the same keys and values as the input entries but with the correct types
 */
export const objectFromEntries = <T extends object>(entries: Iterable<readonly [keyof T, T[keyof T]]>): T => {
  return Object.fromEntries(entries) as T;
};

/**
 * Typed version of Object.entries()
 * @param obj - Object to get entries from
 * @returns - Array of key-value pairs with the correct types
 */
export const objectEntries = <T extends object>(obj: T) => {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
};
