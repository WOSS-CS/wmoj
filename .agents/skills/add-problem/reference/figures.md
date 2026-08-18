# Figures — extracting them, hosting them, embedding them

Most CCC statements carry at least one diagram: a grid, a game board, a graph, an illustrated
example. A statement that drops them is not a faithful copy of the problem, and for several problems
it is not even solvable — the figure *is* the specification.

Figures are hosted in the Supabase storage bucket **`problem_images`** (public read, 5 MB per
object, `png`/`jpeg`/`gif`/`webp` only) and referenced from `content` by an `<img>` tag.

## Two things that catch people out

**The Supabase MCP cannot upload an object.** It speaks SQL, and object bytes do not live in
Postgres. Storage is the one part of publishing that goes over Supabase's REST API instead — which
is what `scripts/upload-image.sh` wraps. Problem *rows* still go through the MCP only; that rule is
unchanged, and this is not a licence to write rows over REST.

**Check whether the figure is vector or raster before you do anything.** Most CCC figures are vector
art, and for those the only route is to render the page and crop. But a real minority are **embedded
bitmaps**, and rendering those at high dpi produces a bigger file with *zero* extra detail — the
upscaling this whole workflow exists to avoid, disguised as a fix.

```bash
pdfimages -list problems/2022/ccc22j3.en.pdf
```

Empty means pure vector: render and crop, and the resolution is yours to choose. A listed image is
the true resolution ceiling for that figure, and no rendering trick beats it — CCC '22 J3's harp is a
214×317 bitmap, CCC '23 J5's word grids are 343×250 and 463×315.

When a figure is raster-backed, **look at the extracted image before deciding to use it**:

```bash
pdfimages -f <page> -l <page> -png <pdf> /tmp/emb/fig
```

If the whole figure is that one bitmap, upload it at native resolution — no resampling, smaller file,
honest ceiling. But if the PDF draws anything *on top* of the raster — annotation lines, labels,
highlighting — extracting it alone silently loses them, and rendering the page is correct despite the
upscale. Compare the extraction against the page render and confirm they show the same thing.

A low-resolution source is simply a low-resolution source. Report the honest number rather than
upscaling to hit a target, and never lower `size` to chase the ratio — legibility beats sharpness
when they conflict.

## The loop

```bash
S=.claude/skills/add-problem/scripts

# 1. Render every page of the PDF (600 dpi by default — see "Resolution" below)
$S/figure.py render problems/2024/ccc24j5.en.pdf /tmp/fig/ccc24j5

# 2. Read each page PNG with the Read tool and find the figures.

# 3. Crop one out. Give the box as fractions of the page (all four <= 1).
$S/figure.py crop /tmp/fig/ccc24j5/ccc24j5.en-2.png /tmp/fig/ccc24j5/fig1.png 0.04 0.455 0.60 0.79

# 4. Read the crop and check it. Re-crop until it is right.

# 5. Upload; it prints the public URL on stdout and ready-made markup on stderr.
$S/upload-image.sh /tmp/fig/ccc24j5/fig1.png problems/ccc24j5/1-patch.png
```

`crop` trims the surrounding whitespace itself, then pads, downscales to 1600 px, and quantises to
a 256-colour palette — flat line art comes out visually identical at a fraction of the size. So the
box you give only has to **contain** the figure and **exclude neighbouring text**; the exact edges do
not matter.

**Give the box as fractions, not pixels.** Fractions are resolution-independent, so the same box
re-crops correctly if you ever re-render the page at a different dpi. That property is what makes a
later quality pass cheap instead of a full redo.

**Look at every crop before uploading it.** Auto-trim cannot distinguish a stray line of body text
from part of the diagram and will keep it, and a box that is slightly too tall silently glues the
heading above or the sentence below onto the figure. Expect a second pass. A crop with half a
sentence stuck to it is worse than the placeholder it replaced.

## Resolution — get this right the first time

**Render vector figures at 600 dpi.** It is `figure.py`'s default, a page takes about two seconds,
and `--max-width` clamps the result either way, so over-rendering costs nothing. (A raster-backed
figure ignores all of this — see above. Its ceiling is whatever `pdfimages -list` reports.)

The reason is arithmetic. The statement column is about 710 CSS px, so a figure at `size="N"` renders
at roughly `7 × N` CSS pixels — and a HiDPI display draws two device pixels for each of those. A
sharp figure therefore needs

> **native width ≥ 2 × (7 × size)**, i.e. `rendered / native ≤ 0.50`

At 200 dpi a typical CCC figure lands at 0.43–0.51: adequate on an old monitor, no margin anywhere
else. Figures that are small on the page — a margin illustration, a compact sample diagram — land far
worse; the first pass over this cohort produced two that were being *upscaled* (ratios 1.36 and 1.32)
and seventeen of forty-two above 0.50. All were re-rendered at 600 dpi.

The fix for an illegible figure is **more dpi, not more `size`**. Raising `size` stretches the same
pixels further and makes the blur worse.

## Embedding

```html
<img size="60" alt="The pumpkin patch for Sample Input 1" src="https://usltyqkrptaaktnmjeyf.supabase.co/storage/v1/object/public/problem_images/problems/ccc24j5/1-patch.png" />
```

That is exactly what the app's own editor emits (`components/MarkdownEditor.tsx`) and the only shape
its sanitizer allows: `MarkdownRenderer` passes raw HTML through `rehype-sanitize` with `img`
whitelisted for `src`, `alt`, and `size` only. Any other attribute — `width`, `style`, `class` — is
silently dropped, and Markdown's own `![alt](url)` syntax works but cannot be sized.

- **`size` is a width percentage of the statement column**, and the renderer applies it as
  `width: N%`. Start from the share of the PDF's text column the figure occupies, rounded to the
  nearest 5 and never below 35 — a small diagram blown up to full width looks broken. A wide grid
  that spans the page is `100`. Then adjust for what print proportion cannot capture: **a figure
  carrying text** — a letter grid, a labelled diagram — needs enough width for that text to read on
  screen. Two CCC '23 J5 word-hunt grids landed at `35` by the print rule and were illegible at
  ~250 px; they are `50` and `60`. Check the result against the resolution rule above.
- **Always write `alt`.** Nothing else describes the figure to a screen reader, and figures here are
  often load-bearing.
- Put the tag on its own line with a blank line above and below.
- Storage path convention: `problems/<problem-id>/<n>-<short-slug>.png`, numbered in the order the
  figures appear in the statement. A stray object is then traceable to the problem that owns it.

Uploads are upserts, so re-cropping and re-uploading to the same path fixes the image everywhere it
is already referenced, with no statement edit.

## Verify

Two checks, both cheap, both worth running:

```sql
select id,
       (select count(*) from regexp_matches(content, '\[image goes here\]', 'g')) as placeholders_left,
       (select count(*) from regexp_matches(content, '<img ', 'g')) as img_tags
from public.problems where id = '<id>';
```

```bash
curl -sS -o /tmp/f.png -w '%{http_code} %{content_type}\n' '<url>'   # expect: 200 image/png
python3 -c "from PIL import Image; print(Image.open('/tmp/f.png').size)"
```

Fetch the URL anonymously, the way a student's browser will. A `400` or `application/json` means the
object is not where the statement says it is, and the page will render a broken image. Then check the
width against the resolution rule: `7 × size / native` must be **≤ 0.50** — unless the figure is
raster-backed and its source cannot get there, in which case record the number and move on.

## If there is no figure to extract

Leave a `[image goes here]` placeholder and tell the user which sample it belongs to. **Never invent
a figure, redraw one from the surrounding prose, or substitute something that looks close.** Same
rule as inventing a constraint.

## The images belong to the statement

`utils/problemImages.ts` scrapes `<img src="…/problem_images/…">` out of `content`, and the admin and
manager DELETE routes use it to clear a deleted problem's objects from the bucket. So an object's
lifetime is tied to the text that references it: if you delete and re-create a problem, re-upload its
figures rather than assuming the old paths survived, and never delete an object you did not just
upload.

## Credentials

`upload-image.sh` reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `main/.env.local`.
This project uses the new-style `sb_secret_…` keys, which are **not JWTs**: they go in an `apikey`
header, and putting one in `Authorization: Bearer` gets a `400 Invalid Compact JWS`. The script
already does the right thing; the note is here for whoever debugs a hand-rolled `curl`.
