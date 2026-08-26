# Writing the problem into Supabase

The only supported way for an agent to publish a problem is a direct insert into the live database
through the Supabase MCP. Not the admin UI, not the app's API routes, not a local Supabase, not a
migration file.

The live project is **WMOJ**, ref **`usltyqkrptaaktnmjeyf`** (us-east-2, Postgres 17). Confirm you
are on it before writing anything — see the preflight gate in SKILL.md.

## Two tables, and publishing writes both

`public.problems` holds the statement and the limits. It is **world-readable**, which is the whole
reason nothing graded may live in it.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | Your slug. `CHECK (id ~ '^[a-zA-Z0-9_\-]{1,60}$')` |
| `name` | `text` | Full title, contest prefix included |
| `content` | `text` | Markdown statement |
| `is_active` | `boolean` | Default `false`. `true` = visible and solvable |
| `time_limit` | `integer` | **Milliseconds.** Default 5000 |
| `memory_limit` | `integer` | **Megabytes.** Default 256; the judge enforces `min(declared, 384)` |
| `points` | `integer` | Required, no default |
| `created_by` | `uuid` | FK to `auth.users(id)`, nullable |
| `created_at` / `updated_at` | `timestamptz` | Default `now()` |

`public.problem_tests` holds the answer key. Its only SELECT policy grants managers and active
admins, so no key a browser holds can read it. These four columns used to sit on `problems`, where
every student could read the expected output of every case; they were moved here and **dropped from
`problems`**. There is now exactly one copy and no fallback.

| Column | Type | Notes |
|---|---|---|
| `problem_id` | `text` PK | FK to `problems(id)`, cascades on delete |
| `input` | `jsonb` | Array of strings, one per case. `NOT NULL`, defaults `[]` |
| `output` | `jsonb` | Array of strings, same length as `input`. `NOT NULL`, defaults `[]` |
| `generator_file` | `text` | The `generator.cpp` source |
| `checker` | `text` | Optional C++ checker source. `NULL`/empty ⇒ byte comparison |

A problem with no `problem_tests` row **cannot be graded at all**: the submit route refuses it
outright rather than grading against an empty set. Never write one table without the other.

There is **no `contest` column**. A problem joins a contest through `contest_problems`, which is a
separate task and out of scope here.

## No migration for this

Inserting a problem is a row-level content change, not a schema change, so it does not get a file
in `supabase/migrations/`. That mandate (see the repo's `AGENTS.md`) covers DDL, RLS policies,
functions, triggers, and enums. If publishing a problem ever requires one of those, stop and raise
it with the user — it means something else is wrong.

## Inserting

Pass the test arrays as JSON and cast, so Postgres validates them. Escaping is the one thing that
reliably goes wrong here: `content` and `generator_file` are multi-line C++ and Markdown full of
quotes and backslashes. Use dollar-quoting with a tag that cannot appear in the body.

```sql
insert into public.problems
  (id, name, content, is_active, time_limit, memory_limit, points, created_by)
values (
  'ccc25j3',
  $name$CCC '25 J3 - Sum Fun$name$,
  $content$## Description
...the full markdown statement...
$content$,
  true,
  1000,
  256,
  3,
  (select id from auth.users where email = '<the user who owns this>' limit 1)
);

insert into public.problem_tests (problem_id, input, output, checker, generator_file)
values (
  'ccc25j3',
  $tests$["1\n2", "3\n4"]$tests$::jsonb,
  $tests$["3", "7"]$tests$::jsonb,
  null,
  $gen$// generator.cpp for CCC '25 J3 - Sum Fun
...the full generator source...
$gen$
);
```

- **Both inserts, or neither.** Send them as one statement batch, so a failure cannot leave a
  problem that is visible but ungradeable. Re-publishing over an existing row is an upsert:

  ```sql
  insert into public.problem_tests (problem_id, input, output, checker, generator_file)
  values ('ccc25j3', $tests$["1\n2", "3\n4"]$tests$::jsonb, $tests$["3", "7"]$tests$::jsonb,
          null, $gen$...the same generator source...$gen$)
  on conflict (problem_id) do update
    set input = excluded.input, output = excluded.output,
        checker = excluded.checker, generator_file = excluded.generator_file;
  ```

- `input`/`output` must be **exactly** the arrays the live judge returned from `/generate-tests` —
  the same bytes you just verified. Do not reformat, re-indent, or regenerate them in between.
- `is_active` is `true` because the ask is a visible, active problem. Leave it `false` only if the
  user asked for a draft.
- Add a `checker` column to the insert (dollar-quoted like `generator_file`) only for a problem whose
  answer is not unique. Omit it otherwise; `NULL` means the judge compares bytes.
- `created_by` may be left `null` if you have no user to attribute it to; it is nullable and only
  used for display. Never invent a UUID — the foreign key to `auth.users` will reject it.
- The `id` must not already exist. Check first; the insert will fail on the primary key otherwise.

### Getting a large test array into the statement

Every byte of `input`/`output` has to pass through the agent's own context on its way into the MCP
call: the arrays live in a file, and the only way to put them in the SQL is to read them and type
them back out. Two things follow.

- **Keep single cases small.** The Read tool truncates a long single-line file at roughly 47 KB, so
  a case bigger than that cannot even be read in one piece. A case under ~25 KB reads and re-emits
  cleanly. This is another reason to keep large cases wide in one dimension only — the byte budget
  in SKILL.md already points the same way.
- **Send it in chunks and checksum each one.** Insert with `input`/`output` as `'[]'::jsonb`, then
  append a slice at a time with `set input = input || $j$[...]$j$::jsonb`. After each chunk compare
  a digest against the same slice on disk. Transcribing thousands of digits is exactly the kind of
  thing that silently drops or duplicates one character, and this catches it while the fix is still
  a one-line correction:

  ```sql
  select (select md5(string_agg(x, chr(10) order by ord))
            from jsonb_array_elements_text(p.input) with ordinality t(x, ord)) as md5_so_far
  from public.problem_tests p where problem_id = 'ccc25j3';
  ```

  A single bad element can be repaired in place with `jsonb_set(output, '{28}', to_jsonb(...))`
  rather than re-sending the whole chunk.
- **Let Postgres build the structured cases.** A case that is a formula — a path graph, a complete
  graph, an alternating array, a run of `L i i+1` operations — can be generated with `repeat()` and
  `generate_series()` instead of transcribed, and it costs nothing to move. Verify the construction
  with `md5()` against the local file *before* appending it. On a recent pair of problems this moved
  ~68 KB of the data for free.

## Verifying the write

Read the row back and confirm the data survived the round trip through `jsonb`. This is the check
that catches escaping damage, and it is the reason the final judge run in SKILL.md uses the arrays
*as stored*, not the local copy.

```sql
select p.id, p.name, p.is_active, p.points, p.time_limit, p.memory_limit,
       jsonb_array_length(t.input)  as cases,
       jsonb_array_length(t.output) as outs,
       (select max(octet_length(x)) from jsonb_array_elements_text(t.input) x)  as max_in,
       (select max(octet_length(x)) from jsonb_array_elements_text(t.output) x) as max_out,
       (select coalesce(sum(octet_length(x)),0) from jsonb_array_elements_text(t.input) x)
     + (select coalesce(sum(octet_length(x)),0) from jsonb_array_elements_text(t.output) x) as total_bytes,
       length(p.content)        as content_len,
       length(t.generator_file) as generator_len
from public.problems p
left join public.problem_tests t on t.problem_id = p.id
where p.id = 'ccc25j3';
```

A `left join` on purpose: if every `t.*` column comes back null then the `problem_tests` row is
missing entirely, and the problem is visible but ungradeable. `cases` must equal `outs`, `max_in` and `max_out` must both be under 1,000,000, and
`generator_len` must be non-zero — a null there means the generator did not get stored and the
problem is only half-published.

## Pulling the stored arrays back out

The final judge run needs the arrays *as stored*, in a file. Do not round-trip them through an MCP
query result — test data runs to hundreds of kilobytes and there is no reason to read it. Fetch it
straight to disk instead.

`problem_tests` is staff-only, so the publishable key cannot read it: this needs the service-role
secret, the same value the app reads as `SUPABASE_SECRET_KEY`. That key bypasses RLS entirely —
never echo it, never put it in a URL, never write it into a file the repo tracks.

```bash
KEY=$(sed -n 's/^SUPABASE_SECRET_KEY=//p'      main/.env.local | tr -d '[:space:]')
URL=$(sed -n 's/^NEXT_PUBLIC_SUPABASE_URL=//p' main/.env.local | tr -d '[:space:]')
[ -n "$KEY" ] || { echo "SUPABASE_SECRET_KEY is not in main/.env.local"; exit 1; }

curl -s "$URL/rest/v1/problem_tests?problem_id=eq.ccc25j3&select=input,output,generator_file" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o row.json

jq '{input: .[0].input, output: .[0].output}' row.json > stored-tests.json
jq -r '.[0].generator_file'                   row.json > stored-generator.cpp
```

This is read-only. It is a convenience for reading; **writes still go through the Supabase MCP**,
never through this endpoint.

With `stored-generator.cpp` in hand you can also prove the strongest property of the whole
workflow — that the generator you stored still reproduces the data you stored:

```bash
.claude/skills/add-problem/scripts/judge-lock.sh generate stored-generator.cpp regenerated.json
diff <(jq -S . stored-tests.json) <(jq -S . regenerated.json) && echo "reproduces exactly"
```

If that diff is empty, a manager can safely re-run the generator later. If it is not, the fixed seed
was dropped or the stored source is not the source that produced the data.

## Backing out

If verification fails and you cannot fix it immediately, take the problem out of sight rather than
leaving a broken one live:

```sql
update public.problems set is_active = false where id = 'ccc25j3';
```

A full `delete` is fine too while the problem is brand new and has no submissions. Once anyone has
submitted to it, deleting orphans their submission rows — `submissions.problem_id` has no foreign
key — so deactivate instead and tell the user.
