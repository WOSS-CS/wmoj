/**
 * The four deliberate differences between the `admin` and `manager` trees,
 * named as data.
 *
 * `app/admin/**` and `app/manager/**` are twin trees: ~6,900 lines that are
 * 87.8% byte-identical, carrying at most a few dozen lines of real semantic
 * difference. Those differences were never written down. They existed as
 * scattered `.eq('created_by', …)` calls, an inline `is_active: false`, two
 * hand-written guard blocks, and a twelve-line comment explaining where a
 * `DELETE` handler deliberately is not — so "the twins drifted and nobody
 * noticed" was the repo's most common defect. {@link STAFF_POLICY} is the
 * single statement of what may differ.
 *
 * **Nothing else may differ between the twins.** A twinned route, page or
 * component that needs a fifth axis of variation is a design change, not a
 * one-line branch: add the flag here, with a comment saying which tree gets
 * which value and why, or do not vary at all.
 *
 * **This is a data record, not a route factory — deliberately.** Factories were
 * built and verified to work against Next.js 16.0.10 (`export const { GET,
 * PATCH } = makeRoute('admin')` serves correctly, and an undeclared method
 * still 405s), and were rejected on design grounds: a three-line route file
 * cannot be read, and policy booleans branching inside one shared handler is
 * how a bag-of-booleans interface starts. Handlers stay written out in each
 * `route.ts` and read from this record. Greppability is load-bearing — a route
 * missing its twin has to stay findable by grep.
 *
 * One trap if factories are ever reopened: route *segment config* (`dynamic`,
 * `revalidate`, `runtime`, `fetchCache`, `dynamicParams`, `maxDuration`) is
 * statically extracted from the SWC AST, which reads `declaration.id.value` —
 * `undefined` for an `ObjectPattern`. A destructured segment-config export is
 * invisible to the analyzer, silently and with no warning. Any factory may emit
 * HTTP methods only.
 *
 * Pure: this module imports nothing and is safe on both sides of the
 * server/client split.
 */

/** One of the two staff route trees. The tree is a URL prefix plus a policy. */
export type StaffTree = 'admin' | 'manager';

export interface StaffPolicy {
  tree: StaffTree;
  /** The membership table `lib/staffAuth.ts` checks for this tree. */
  table: 'admins' | 'managers';
  /** admin true / manager false — creations land `is_active = false` (pending). */
  createsPending: boolean;
  /** admin true / manager false — `.eq('created_by', user.id)` on reads and writes. */
  scopeToOwner: boolean;
  /** admin true / manager false — PATCH/DELETE on an already-activated contest ⇒ 403. */
  guardActivatedContest: boolean;
  /** admin false / manager true — may flip `is_active`. */
  mayPublish: boolean;
  /**
   * admin false / manager true — the admin `submissions/[id]` route exports no
   * `DELETE`. No `submissions` DELETE policy fits an admin, so the handler that
   * used to exist silently deleted zero rows. Do not reintroduce it.
   */
  mayDeleteSubmission: boolean;
}

export const STAFF_POLICY: Record<StaffTree, StaffPolicy> = {
  admin: {
    tree: 'admin',
    table: 'admins',
    createsPending: true,
    scopeToOwner: true,
    guardActivatedContest: true,
    mayPublish: false,
    mayDeleteSubmission: false,
  },
  manager: {
    tree: 'manager',
    table: 'managers',
    createsPending: false,
    scopeToOwner: false,
    guardActivatedContest: false,
    mayPublish: true,
    mayDeleteSubmission: true,
  },
};

/**
 * Every URL a shared staff component needs, for one tree.
 *
 * The fields are plain `string`, not template-literal types (`` `/${T}` ``).
 * Precision would buy nothing: every consumer either interpolates the value
 * into a `fetch` URL or hands it to `<Link href>`, both of which take `string`,
 * and a per-tree generic would leak into every prop type that carries these
 * around. {@link staffPolicy.test.ts} pins the actual strings instead, which is
 * the check that would catch a wrong path — a template-literal type would not.
 *
 * `api` is the tree's API root; endpoints that only one component uses are
 * built from it (`${routes.api}/problems/create`), so this list stays the set
 * of URLs that more than one caller needs.
 */
export interface StaffRoutes {
  /** The tree root, e.g. `/admin`. Every other page path starts with it. */
  root: string;
  /** The tree's API root, e.g. `/api/admin`. Every API path starts with it. */
  api: string;
  dashboard: string;
  problemsCreate: string;
  problemsManage: string;
  contestsCreate: string;
  contestsManage: string;
  help: string;
  /** The problem-search API `ProblemSearch` posts to. */
  problemSearch: string;
  /** The generator API the create-problem form posts to. */
  generate: string;
}

/** Pure: the URL half of a staff tree. */
export function staffRoutes(tree: StaffTree): StaffRoutes {
  const root = `/${tree}`;
  const api = `/api/${tree}`;
  return {
    root,
    api,
    dashboard: `${root}/dashboard`,
    problemsCreate: `${root}/problems/create`,
    problemsManage: `${root}/problems/manage`,
    contestsCreate: `${root}/contests/create`,
    contestsManage: `${root}/contests/manage`,
    help: `${root}/help`,
    problemSearch: `${api}/problems/search`,
    generate: `${api}/problems/generator/generate`,
  };
}
