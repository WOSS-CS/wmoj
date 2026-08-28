import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBearerHeader } from '@/lib/requestAuth';

/**
 * The one token parser. The three it replaces disagreed, and the disagreement
 * was a live 401 for anyone whose client sent a legal but unusual header — so
 * every case below is pinned rather than left to whichever implementation a
 * route happened to copy.
 */

test('the ordinary case', () => {
  assert.equal(parseBearerHeader('Bearer abc.def.ghi'), 'abc.def.ghi');
});

test('the scheme is compared case-insensitively, per RFC 7235', () => {
  assert.equal(parseBearerHeader('bearer abc'), 'abc');
  assert.equal(parseBearerHeader('BEARER abc'), 'abc');
  assert.equal(parseBearerHeader('BeArEr abc'), 'abc');
});

test('extra whitespace after the scheme is tolerated, not turned into an empty token', () => {
  // `split(" ")[1]` returned '' here and answered 401 — the exact defect this
  // parser exists to remove.
  assert.equal(parseBearerHeader('Bearer  abc'), 'abc');
  assert.equal(parseBearerHeader('Bearer\tabc'), 'abc');
  assert.equal(parseBearerHeader('Bearer   abc   '), 'abc');
});

test('a token containing no spaces is never split', () => {
  // `substring(7)` would have dropped the second segment of a header that had
  // two spaces before the token; the whole remainder is the credential.
  assert.equal(parseBearerHeader('Bearer eyJhbGciOi.J9.sig'), 'eyJhbGciOi.J9.sig');
});

test('a missing header is null', () => {
  assert.equal(parseBearerHeader(null), null);
  assert.equal(parseBearerHeader(undefined), null);
  assert.equal(parseBearerHeader(''), null);
});

test('another scheme is null, never treated as a bearer token', () => {
  assert.equal(parseBearerHeader('Basic abc'), null);
  assert.equal(parseBearerHeader('Digest abc'), null);
  assert.equal(parseBearerHeader('abc'), null);
});

test('the scheme has to end where it says it does', () => {
  assert.equal(parseBearerHeader('Bearerabc'), null);
  assert.equal(parseBearerHeader('Bearertoken value'), null);
});

test('a scheme with no credentials is null', () => {
  assert.equal(parseBearerHeader('Bearer'), null);
  assert.equal(parseBearerHeader('Bearer '), null);
  assert.equal(parseBearerHeader('Bearer   '), null);
  assert.equal(parseBearerHeader('Bearer\t\n'), null);
});
