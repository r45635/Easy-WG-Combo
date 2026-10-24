'use strict';

// Look up a record by a user-supplied id without walking into the prototype
// chain. Kept pure and dependency-free so it can be unit tested.
//
// Why: every store here is a plain object parsed from JSON, keyed by id, and
// the routes read `store[req.params.id]`. For id="__proto__" that expression
// returns Object.prototype — which is truthy, so an `if (!rec) return 404`
// guard lets it through, and the next `rec.field = value` writes onto
// Object.prototype for the lifetime of the process. "constructor" and
// "prototype" behave the same way.
//
// CodeQL flags this as js/prototype-polluting-assignment; it is a real class,
// not a false positive. The routes require authentication, which bounds it,
// but a guard that costs one function call should not be left out.

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function safeLookup(store, key) {
  if (!store || typeof store !== 'object') return undefined;
  if (typeof key !== 'string' && typeof key !== 'number') return undefined;
  const k = String(key);
  if (FORBIDDEN_KEYS.has(k)) return undefined;
  // hasOwn rather than `in`: an inherited member must never resolve, even if a
  // future key escapes the list above.
  return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : undefined;
}

module.exports = { safeLookup, FORBIDDEN_KEYS };
