/**
 * Advisor v2 types.
 *
 * The canonical definitions live in `shared/advisorV2.ts` so the server
 * endpoints can use the same wire contract. This module re-exports them for
 * app-side consumers that import from `~/types/advisorV2`.
 */
export type * from "~~/shared/advisorV2";
