import { canUseWASM, type HighlighterTypes } from '@pierre/diffs';

/**
 * Highlights needs WebAssembly SIMD. Engines without it, or a CSP that blocks
 * WASM, stay on Shiki's JavaScript engine. One backend can be active per realm,
 * so every highlighter entry point must use this value.
 */
const wasmAvailable = canUseWASM();
export const DIFF_HIGHLIGHTER: HighlighterTypes = wasmAvailable ? 'highlights' : 'shiki-js';

/** Worker pool is only used for the shiki-js fallback (Highlights prefers main thread). */
export const DIFF_USE_WORKER_POOL = DIFF_HIGHLIGHTER !== 'highlights';
