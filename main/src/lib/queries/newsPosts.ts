import type { AssertColumns, Checked } from './columns';
import type { Row } from '@/types/supabase';

/**
 * The `news_posts` column sets.
 *
 * The author's name always arrives as an embed, because `news_posts.uid`
 * references `users` — but the two trees spell it differently and must:
 * `users!uid(username)` names the FK explicitly (there is more than one path
 * from `news_posts` to `users` for PostgREST to pick from), while the two
 * public feeds use `users!inner(username)` so a post whose author row is gone
 * drops out instead of rendering "Unknown".
 *
 * The embedded constants carry no `Pick` beside them: PostgREST resolves an
 * embed's shape and the typed client infers it, so there is nothing for a
 * hand-written `Pick` to check.
 */

/** The signed-out home feed and its "Load more" companion. Author must exist. */
export const NEWS_POST_FEED_COLUMNS = 'id, title, content, date_posted, users!inner(username)';

/** The manager list table. No body — the table renders titles and dates only. */
export const NEWS_POST_LIST_COLUMNS = 'id, title, date_posted, updated_at, users!uid(username)';

/** One post as `api/manager/newsposts` returns it, body and author included. */
export const NEWS_POST_DETAIL_COLUMNS =
  'id, title, content, date_posted, updated_at, users!uid(username)';

/**
 * One post as the editor loads it, and as the write handlers echo back. No
 * author embed: the editor never shows one, and both handlers already know who
 * is writing.
 */
export const NEWS_POST_EDIT_COLUMNS = 'id, title, content, date_posted, updated_at';

/** One row of {@link NEWS_POST_EDIT_COLUMNS}. */
export type NewsPostEditRow = Pick<
  Row<'news_posts'>,
  'id' | 'title' | 'content' | 'date_posted' | 'updated_at'
>;

/**
 * Compile-time proof that each column string above names exactly the keys of
 * its row type. Adding a column to one and forgetting the other is a build
 * error here rather than a row type that quietly disagrees with the row
 * fetched. Exported only so it counts as used; nothing imports it.
 *
 * Embedded lists are absent on purpose — an embed has no `Pick` to check.
 */
export type ColumnChecks = [
  Checked<AssertColumns<typeof NEWS_POST_EDIT_COLUMNS, NewsPostEditRow>>,
];
