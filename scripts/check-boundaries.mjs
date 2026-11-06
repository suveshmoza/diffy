#!/usr/bin/env node
/**
 * Enforces the import direction between the top-level source zones.
 *
 * Layout:
 *   shared/       reusable primitives, no feature knowledge
 *   domains/<x>/  feature slices; may use shared + their own files
 *   app/          composition root for the overlay React app
 *   entrypoints/  WXT entrypoints; may use app, domains, shared
 *
 * Hard errors:
 *   - shared -> app | domains | entrypoints
 *   - domains -> app
 *   - anything (outside entrypoints) -> entrypoints
 *
 * Cross-domain imports (domains/a -> domains/b) are reported as warnings so
 * the remaining coupling stays visible without blocking work. Run with
 * `--strict` to turn warnings into errors.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SRC = resolve(import.meta.dirname, '..', 'src');
const STRICT = process.argv.includes('--strict');
const SKIP = new Set(['modules', 'types', 'assets']);

const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;

/** @returns {string[]} */
function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(path);
    }
  }
  return files;
}

/** Resolve an import specifier to a src-relative POSIX path, or null for packages. */
function resolveTarget(fromFile, specifier) {
  if (specifier.startsWith('@/')) {
    return specifier.slice(2);
  }
  if (specifier.startsWith('.')) {
    const absolute = resolve(dirname(fromFile), specifier);
    return relative(SRC, absolute).split(sep).join('/');
  }
  return null;
}

function zoneOf(srcRelative) {
  const parts = srcRelative.split('/');
  return {
    top: parts[0],
    domain: parts[0] === 'domains' ? parts[1] : undefined,
  };
}

function lineOf(code, index) {
  return code.slice(0, index).split('\n').length;
}

const errors = [];
const warnings = [];
const crossDomainCounts = new Map();

for (const file of walk(SRC)) {
  const srcRelative = relative(SRC, file).split(sep).join('/');
  const from = zoneOf(srcRelative);

  if (SKIP.has(from.top)) continue;

  const code = readFileSync(file, 'utf8');
  for (const match of code.matchAll(SPECIFIER_RE)) {
    const target = resolveTarget(file, match[1]);
    if (target == null) continue;

    const to = zoneOf(target);
    const at = `${srcRelative}:${lineOf(code, match.index)}`;

    if (from.top === 'shared' && ['app', 'domains', 'entrypoints'].includes(to.top)) {
      errors.push(`${at}  shared must not import ${to.top}/ (${match[1]})`);
      continue;
    }

    if (from.top === 'domains' && to.top === 'app') {
      errors.push(`${at}  domains must not import app/ (${match[1]})`);
      continue;
    }

    if (to.top === 'entrypoints' && from.top !== 'entrypoints') {
      errors.push(`${at}  only entrypoints may import entrypoints/ (${match[1]})`);
      continue;
    }

    if (from.top === 'domains' && to.top === 'domains' && from.domain !== to.domain) {
      const edge = `${from.domain} -> ${to.domain}`;
      crossDomainCounts.set(edge, (crossDomainCounts.get(edge) ?? 0) + 1);
      warnings.push(`${at}  cross-domain import ${edge} (${match[1]})`);
    }
  }
}

if (crossDomainCounts.size > 0) {
  console.warn('Cross-domain imports (informational):');
  for (const [edge, count] of [...crossDomainCounts].toSorted((a, b) => b[1] - a[1])) {
    console.warn(`  ${edge}  ${count}`);
  }
  console.warn('');
}

if (process.argv.includes('--verbose') && warnings.length > 0) {
  console.warn(`${warnings.length} cross-domain import(s):`);
  for (const warning of warnings) console.warn(`  ${warning}`);
  console.warn('');
}

if (errors.length > 0) {
  console.error(`${errors.length} boundary violation(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

if (STRICT && warnings.length > 0) {
  console.error('Strict mode: cross-domain imports are not allowed.');
  process.exit(1);
}

console.log('Import boundaries look good.');
