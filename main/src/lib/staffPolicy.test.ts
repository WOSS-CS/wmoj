import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAFF_POLICY,
  staffRoutes,
  type StaffTree,
  type StaffRoutes,
} from '@/lib/staffPolicy';

/**
 * The four deliberate deltas between the `admin` and `manager` trees, pinned
 * LITERALLY. The point of `STAFF_POLICY` is that these values are stated once
 * instead of being scattered through twelve route files, so the test states
 * them once more, by hand, rather than deriving them from the record it is
 * checking — a test that read `STAFF_POLICY.admin.scopeToOwner` to assert
 * `STAFF_POLICY.admin.scopeToOwner` would pass whatever the record said.
 *
 * The key-set assertion is deliberate too: a sixth flag is a design change
 * ("nothing else may differ between the twins"), so it must be a deliberate
 * edit here as well as in `staffPolicy.ts`.
 */

const TREES: StaffTree[] = ['admin', 'manager'];

const POLICY_KEYS = [
  'tree',
  'table',
  'createsPending',
  'scopeToOwner',
  'guardActivatedContest',
  'mayPublish',
  'mayDeleteSubmission',
];

test('admin policy: pending creations, owner-scoped, guarded, publishes nothing', () => {
  assert.deepEqual(STAFF_POLICY.admin, {
    tree: 'admin',
    table: 'admins',
    createsPending: true,
    scopeToOwner: true,
    guardActivatedContest: true,
    mayPublish: false,
    mayDeleteSubmission: false,
  });
});

test('manager policy: the inverse of the admin policy on all five flags', () => {
  assert.deepEqual(STAFF_POLICY.manager, {
    tree: 'manager',
    table: 'managers',
    createsPending: false,
    scopeToOwner: false,
    guardActivatedContest: false,
    mayPublish: true,
    mayDeleteSubmission: true,
  });
});

test('a policy carries exactly the five flags plus its own identity', () => {
  for (const tree of TREES) {
    assert.deepEqual(
      Object.keys(STAFF_POLICY[tree]).sort(),
      [...POLICY_KEYS].sort(),
      `${tree} policy has an unexpected key set`,
    );
  }
});

test('each policy knows which tree it belongs to', () => {
  for (const tree of TREES) {
    assert.equal(STAFF_POLICY[tree].tree, tree);
  }
});

test('the admin and manager roots are the two API prefixes the routes live under', () => {
  assert.equal(staffRoutes('admin').root, '/admin');
  assert.equal(staffRoutes('admin').api, '/api/admin');
  assert.equal(staffRoutes('manager').root, '/manager');
  assert.equal(staffRoutes('manager').api, '/api/manager');
});

test('every admin route resolves to the real admin path', () => {
  assert.deepEqual(staffRoutes('admin'), {
    root: '/admin',
    api: '/api/admin',
    dashboard: '/admin/dashboard',
    problemsCreate: '/admin/problems/create',
    problemsManage: '/admin/problems/manage',
    contestsCreate: '/admin/contests/create',
    contestsManage: '/admin/contests/manage',
    help: '/admin/help',
    problemSearch: '/api/admin/problems/search',
    generate: '/api/admin/problems/generator/generate',
  } satisfies StaffRoutes);
});

test('every manager route resolves to the real manager path', () => {
  assert.deepEqual(staffRoutes('manager'), {
    root: '/manager',
    api: '/api/manager',
    dashboard: '/manager/dashboard',
    problemsCreate: '/manager/problems/create',
    problemsManage: '/manager/problems/manage',
    contestsCreate: '/manager/contests/create',
    contestsManage: '/manager/contests/manage',
    help: '/manager/help',
    problemSearch: '/api/manager/problems/search',
    generate: '/api/manager/problems/generator/generate',
  } satisfies StaffRoutes);
});

test('every route string stays inside its own tree', () => {
  const other: Record<StaffTree, StaffTree> = { admin: 'manager', manager: 'admin' };
  for (const tree of TREES) {
    const routes = staffRoutes(tree);
    const entries = Object.entries(routes) as Array<[keyof StaffRoutes, string]>;
    // A page path starts with `/admin`; an API path starts with `/api/admin`.
    // `api` itself satisfies neither rule against `root`, so it is its own case.
    for (const [key, value] of entries) {
      const prefix = value.startsWith('/api/') ? routes.api : routes.root;
      assert.ok(
        value === prefix || value.startsWith(`${prefix}/`),
        `${tree}.${key} = ${value} does not sit under ${prefix}`,
      );
      assert.ok(
        !value.includes(other[tree]),
        `${tree}.${key} = ${value} names the other tree`,
      );
    }
  }
});
