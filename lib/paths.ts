/**
 * Small utility to read the base path everywhere in a type-safe way.
 * Falls back to "" in local dev (no mount path).
 */
export const BASE_PATH: string = (process.env.NEXT_PUBLIC_BASE_PATH as string) || "";
export const apiUrl = (p: string) => `${BASE_PATH}${p.startsWith("/") ? p : `/${p}`}`;
