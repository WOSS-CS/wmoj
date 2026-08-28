/**
 * The compile-time link between a `_COLUMNS` string and its `Pick<Row<…>>`.
 *
 * Every file in this directory pairs a PostgREST select string with a row type.
 * The typed Supabase client checks the STRING against the generated schema and
 * `Pick` checks the NAMES against it — but nothing checks the two against EACH
 * OTHER, so adding a column to one and forgetting the other produces a row type
 * that quietly disagrees with the row actually fetched. Keeping them adjacent
 * was the convention; {@link AssertColumns} makes it a build error instead.
 *
 * Usage, once per pair:
 *
 * ```ts
 * export const FOO_COLUMNS = 'id, name';
 * export type FooRow = Pick<Row<'foo'>, 'id' | 'name'>;
 * // …then one entry per pair in the file's `ColumnChecks` tuple:
 * export type ColumnChecks = [Checked<AssertColumns<typeof FOO_COLUMNS, FooRow>>];
 * ```
 *
 * `ColumnChecks` is exported only so it counts as used; nothing imports it.
 *
 * Only lists of plain column names can be checked this way. An EMBED
 * (`problems(id, name)`) has no `Pick` to compare against — PostgREST resolves
 * its shape and the client infers it — so those constants are left unasserted,
 * with a comment saying so.
 */

/**
 * Forces its argument to be `true`, so `Checked<AssertColumns<…>>` is a compile
 * error — reporting which names drifted — the moment the pair disagrees.
 */
export type Checked<T extends true> = T;

/** Strip leading and trailing spaces from a string literal type. */
type Trim<S extends string> = S extends ` ${infer R}`
  ? Trim<R>
  : S extends `${infer R} `
    ? Trim<R>
    : S;

/** Split a comma-separated select string into the union of its column names. */
type SplitColumns<S extends string> = S extends `${infer Head},${infer Rest}`
  ? Trim<Head> | SplitColumns<Rest>
  : Trim<S>;

/**
 * Resolves to `true` when `Columns` names exactly the keys of `RowType`, and to
 * a descriptive error type otherwise — which fails to satisfy the `true`
 * constraint, so `type _Check = AssertColumns<…>` is a compile error at the
 * point of drift.
 */
export type AssertColumns<Columns extends string, RowType> =
  [SplitColumns<Columns>] extends [keyof RowType]
    ? [keyof RowType] extends [SplitColumns<Columns>]
      ? true
      : { error: 'row type has keys the column string does not select'; missing: Exclude<keyof RowType, SplitColumns<Columns>> }
    : { error: 'column string selects names the row type does not have'; extra: Exclude<SplitColumns<Columns>, keyof RowType> };
