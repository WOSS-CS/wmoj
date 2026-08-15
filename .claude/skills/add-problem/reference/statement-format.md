# Writing the problem statement (`problems.content`)

`content` is Markdown, rendered by `main/src/components/MarkdownRenderer.tsx`. Match the shape the
existing problems use — a statement that renders differently from its neighbours looks broken even
when it is correct.

## Skeleton

````markdown
## Description
One or two paragraphs of the story and the task.

## Input Specification
What each line of stdin contains, with the constraints inline as KaTeX.

## Output Specification
Exactly what to print.

### Sample Input 1
```text
5
1
2 4
```

### Sample Output 1
```text
3
```

### Explanation
Why that output is correct.

---

### Sample Input 2
...
````

Variations that are already in use and are fine: an opening bold line naming the source contest
(`**Canadian Computing Competition: 2025 Stage 1, Junior #1**`) instead of a `## Description`
heading, and `### **Sample Input 1**` with the bold markers. Pick one style and hold it for the
whole statement.

## Rules

- **No `#` title heading.** The title lives in the `name` column and is rendered above the body. A
  `#` line in `content` makes it appear twice.
- **No time or memory limit lines.** Those live in `time_limit` and `memory_limit` and are rendered
  by the page. Source `.md` files converted from a PDF usually carry them at the top — delete them.
- **Sample I/O goes in fenced blocks tagged `text`.** Not `plaintext`, not bare indentation. Any
  other language tag turns on syntax highlighting, which looks wrong for I/O.
- **Math is KaTeX**: `$N \le 10^5$` inline, `$$...$$` display. Constraints are written as math, not
  as plain text (`$1 \le N \le 1000$`, not `1 <= N <= 1000`).
- **A marks-distribution table is a GFM table**, copied faithfully from the source. It tells the
  reader what the test groups are, and it is what you generate the cases from.
- **Single newlines become line breaks.** `remark-breaks` is enabled, so a paragraph you wrapped at
  80 columns renders with hard breaks at every wrap point. Keep each paragraph on one line.
- **`---` separates sample blocks**, matching the existing problems.
- **Images.** The renderer allows `<img src="..." size="50">` (`size` is a width percentage), but
  there is nowhere in this repo to host an extracted figure. When the source has a diagram, leave a
  `[image goes here]` placeholder and tell the user which sample it belongs to, so they can add it
  by hand. Never invent a description of a figure and pass it off as the statement.
- Raw HTML is passed through `rehype-sanitize`, so most of it survives but anything exotic will be
  silently dropped. Stick to Markdown.

## Title (`name` column)

Keep the source contest's prefix: `CCC '25 J2 - Donut Shop`, not `Donut Shop`. It is how problems
are found in the list, and how they sort next to their siblings.

## ID (`id` column)

The primary key is a text slug you choose, constrained by `problems_id_format` to
`^[a-zA-Z0-9_\-]{1,60}$`. Existing problems use a compact contest slug: `ccc25j1`, `ccc22j5`,
`graph3p2`. Follow that. (Older rows have UUIDs from an earlier workflow — do not copy that.)

## Choosing `points`, `time_limit`, `memory_limit`

`points` drives scoring, so it encodes difficulty. The live scale:

| Points | Roughly |
|---|---|
| 1 | Intro — arithmetic, one loop, a conditional |
| 3 | Easy — arrays, sorting, simple simulation, basic traversal |
| 5 | Medium — needs a real algorithm or data structure |
| 7 | Harder medium |
| 10 | Hard — non-trivial algorithm, careful complexity |

`time_limit` is **milliseconds**, `memory_limit` is **megabytes**. Take the source problem's
official limits when they exist. Otherwise 1000–2000 ms covers almost everything; 3000 ms is the
top of what is in use.

**Never set `memory_limit` above 512.** The judge host has 512 MB of RAM in total, so a larger
limit can never be enforced — it is a promise the machine cannot keep. Six existing problems
declare 1024 MB; that is a mistake to avoid, not a precedent. 256 MB is the default and is right
for nearly everything.
