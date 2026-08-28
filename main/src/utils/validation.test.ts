import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUuid, validateSlug } from './validation';

describe('isUuid', () => {
  it('accepts the RFC 4122 text form in either case', () => {
    assert.equal(isUuid('11111111-1111-1111-1111-111111111111'), true);
    assert.equal(isUuid('8b13d4bf-75eb-4fd9-b04a-853d099186f4'), true);
    assert.equal(isUuid('8B13D4BF-75EB-4FD9-B04A-853D099186F4'), true);
    assert.equal(isUuid('00000000-0000-0000-0000-000000000000'), true);
  });

  it('rejects everything Postgres would raise 22P02 on', () => {
    // The literal a client sends when it interpolates a missing id.
    assert.equal(isUuid('undefined'), false);
    assert.equal(isUuid(''), false);
    assert.equal(isUuid('not-a-uuid'), false);
    // Right characters, wrong grouping.
    assert.equal(isUuid('8b13d4bf75eb4fd9b04a853d099186f4'), false);
    // One digit short in the last group.
    assert.equal(isUuid('8b13d4bf-75eb-4fd9-b04a-853d099186f'), false);
    // Non-hex.
    assert.equal(isUuid('8b13d4bf-75eb-4fd9-b04a-853d099186fg'), false);
    // Surrounding whitespace is not trimmed: the value is used as-is in a query.
    assert.equal(isUuid(' 8b13d4bf-75eb-4fd9-b04a-853d099186f4'), false);
  });
});

describe('validateSlug', () => {
  it('names the entity in every message', () => {
    assert.equal(validateSlug('', 'Problem'), 'Problem ID is required');
    assert.match(validateSlug('a b', 'Contest') ?? '', /^Contest ID cannot contain spaces$/);
    assert.match(validateSlug('a/b', 'Contest') ?? '', /^Contest ID must be 1-60 characters/);
  });

  it('accepts the slugs the routes store', () => {
    assert.equal(validateSlug('sum-two', 'Problem'), null);
    assert.equal(validateSlug('quick_contest_2', 'Contest'), null);
    assert.equal(validateSlug('a'.repeat(60), 'Problem'), null);
    assert.notEqual(validateSlug('a'.repeat(61), 'Problem'), null);
  });
});
