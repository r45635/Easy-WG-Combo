'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { safeLookup, nullProtoStore } = require('../lib/safe-lookup');

test('safeLookup — returns own entries unchanged', () => {
  const store = JSON.parse('{"dev_1":{"name":"phone"},"dev_2":{"name":"laptop"}}');
  assert.deepStrictEqual(safeLookup(store, 'dev_1'), { name: 'phone' });
  assert.strictEqual(safeLookup(store, 'dev_missing'), undefined);
  assert.strictEqual(safeLookup({}, 'anything'), undefined);
});

test('safeLookup — __proto__ no longer resolves to Object.prototype', () => {
  const store = JSON.parse('{"dev_1":{}}');
  // The bug: store['__proto__'] is Object.prototype, which is truthy, so an
  // `if (!rec) return 404` guard passes and the next assignment lands on the
  // prototype for the lifetime of the process.
  assert.strictEqual(typeof store.__proto__, 'object');
  assert.ok(store.__proto__, 'precondition: the raw lookup is truthy');
  assert.strictEqual(safeLookup(store, '__proto__'), undefined);
});

test('safeLookup — constructor and prototype do not resolve either', () => {
  const store = JSON.parse('{"dev_1":{}}');
  assert.ok(store.constructor, 'precondition: the raw lookup is truthy');
  assert.strictEqual(safeLookup(store, 'constructor'), undefined);
  assert.strictEqual(safeLookup(store, 'prototype'), undefined);
});

test('safeLookup — inherited members never resolve', () => {
  const store = Object.create({ inherited: { secret: true } });
  store.own = { ok: true };
  assert.ok(store.inherited, 'precondition: the raw lookup is truthy');
  assert.strictEqual(safeLookup(store, 'inherited'), undefined);
  assert.deepStrictEqual(safeLookup(store, 'own'), { ok: true });
  assert.strictEqual(safeLookup(store, 'hasOwnProperty'), undefined);
  assert.strictEqual(safeLookup(store, 'toString'), undefined);
});

test('safeLookup — writing through the result cannot touch Object.prototype', () => {
  const store = JSON.parse('{"dev_1":{}}');
  const rec = safeLookup(store, '__proto__');
  assert.strictEqual(rec, undefined, 'a route would 404 here instead of writing');
  assert.strictEqual({}.polluted, undefined);
});

test('safeLookup — hostile or absent input fails closed', () => {
  assert.strictEqual(safeLookup(null, 'x'), undefined);
  assert.strictEqual(safeLookup(undefined, 'x'), undefined);
  assert.strictEqual(safeLookup('a string', '0'), undefined);
  assert.strictEqual(safeLookup({ x: 1 }, null), undefined);
  assert.strictEqual(safeLookup({ x: 1 }, undefined), undefined);
  assert.strictEqual(safeLookup({ x: 1 }, {}), undefined);
});

test('nullProtoStore — no prototype chain for a user id to reach', () => {
  const store = nullProtoStore(JSON.parse('{"dev_1":{"name":"phone"}}'));
  assert.strictEqual(Object.getPrototypeOf(store), null);
  // The root fix: the raw lookup is now undefined, not Object.prototype.
  assert.strictEqual(store['__proto__'], undefined);
  assert.strictEqual(store['constructor'], undefined);
  assert.strictEqual(store['toString'], undefined);
  assert.deepStrictEqual(store.dev_1, { name: 'phone' });
});

test('nullProtoStore — a hostile file cannot smuggle a prototype in', () => {
  // JSON.parse creates __proto__ as an OWN key rather than invoking the setter,
  // so a crafted store file would carry it. On a null-prototype target it is
  // just an ordinary key with nothing behind it.
  const store = nullProtoStore(JSON.parse('{"__proto__":{"polluted":true},"dev_1":{}}'));
  assert.strictEqual(Object.getPrototypeOf(store), null);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(safeLookup(store, '__proto__'), undefined, 'still refused by the second line');
});

test('nullProtoStore — ordinary object operations still work', () => {
  const store = nullProtoStore({ a: 1, b: 2 });
  assert.deepStrictEqual(Object.keys(store).sort(), ['a', 'b']);
  assert.deepStrictEqual(Object.entries(store).length, 2);
  assert.strictEqual(JSON.stringify(store), '{"a":1,"b":2}');
  assert.deepStrictEqual({ ...store }, { a: 1, b: 2 });
  store.c = 3;
  assert.strictEqual(store.c, 3);
});

test('nullProtoStore — absent or hostile input yields an empty store', () => {
  for (const bad of [null, undefined, 'x', 42]) {
    const s = nullProtoStore(bad);
    assert.strictEqual(Object.getPrototypeOf(s), null);
    assert.deepStrictEqual(Object.keys(s), []);
  }
});
