import { canUseWASM, type HighlighterTypes } from '@pierre/diffs';

/**
 * Highlights needs WebAssembly SIMD. Engines without it, or a CSP that blocks
 * WASM, stay on Shiki's JavaScript engine. One backend can be active per realm,
 * so every highlighter entry point must use this value.
 */
export const DIFF_HIGHLIGHTER: HighlighterTypes = canUseWASM() ? 'highlights' : 'shiki-js';
