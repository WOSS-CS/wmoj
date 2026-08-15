# The generator contract and house style

Every WMOJ problem's test data is produced by a `generator.cpp`, and that source is stored
alongside the data in `problems.generator_file`. The stored source is not decoration — a manager
can pull it up later, tweak a constraint, and re-run it to regenerate the whole set. It only works
if the file you store is the exact file that produced the data you store.

## Hard contract

The judge compiles the generator with `g++ -O2 -std=gnu++17` (the requested `language` is validated
and then ignored) and runs the binary in the sandbox with 60 s and 1 GB. Then:

- **stdout** must be a single JSON array of strings — element `i` is the stdin for test case `i`.
- **stderr** must be a single JSON array of strings — element `i` is the expected stdout for case `i`.
- Both arrays must be the same length, non-empty, and contain only strings.
- Every string must be JSON-escaped. No raw control characters inside the quotes.
- Exit status must be 0.

Anything else — an unparseable array, a length mismatch, a non-zero exit — comes back as HTTP 400
from `/generate-tests` with the raw stdout/stderr attached so you can see what went wrong.

Nothing else may be written to stdout or stderr. A stray debug `cerr` line corrupts the output
array, and the failure looks like a JSON parse error rather than a stray print.

## House style

The two generators already in the database (`ccc25j1`, `ccc25j2`) and the template published at
`main/public/generator.md` agree on a specific shape. Match it — a generator that works but reads
nothing like the others is a small tax on everyone who opens it later.

```cpp
// generator.cpp for CCC '25 J1 - Roller Coaster Ride
//
// Problem: given N (place in line), C (cars), P (people per car),
// print "yes" iff N <= C*P, otherwise "no".
//
// Test plan:
//   - Both official sample inputs are included verbatim.
//   - Boundary cases around N == C*P (the only interesting threshold).
//   - Smallest possible values (1, 1, 1).
//   - A balanced mix of randomly-generated "yes" and "no" cases at
//     small and larger scales.

#include <bits/stdc++.h>

using namespace std;

// JSON-escape a string so it is safe to drop between double quotes
// inside a JSON array element. Handles the seven escapes required
// by the JSON spec; everything else is passed through verbatim.
string json_escape(const string &s) {
    string out;
    out.reserve(s.size());
    for (char c : s) {
        if (c == '\\')      out += "\\\\";
        else if (c == '"')  out += "\\\"";
        else if (c == '\b') out += "\\b";
        else if (c == '\f') out += "\\f";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else                out += c;
    }
    return out;
}

int main() {
    std::mt19937_64 rng(123456789); // fixed seed for reproducibility

    vector<string> inputs;
    vector<string> outputs;

    // -------- Official sample cases (verbatim from the problem) --------
    inputs.push_back("14\n3\n2");  outputs.push_back("no");
    inputs.push_back("12\n4\n3");  outputs.push_back("yes");

    // -------- Hand-crafted edge cases --------
    // ... smallest values, boundaries, degenerate shapes ...

    // -------- Randomised cases --------
    // ... scaled up toward the stated constraints ...

    // Print input JSON array to stdout
    cout << "[";
    for (size_t i = 0; i < inputs.size(); ++i) {
        if (i) cout << ", ";
        cout << "\"" << json_escape(inputs[i]) << "\"";
    }
    cout << "]" << endl;

    // Print output JSON array to stderr
    cerr << "[";
    for (size_t i = 0; i < outputs.size(); ++i) {
        if (i) cerr << ", ";
        cerr << "\"" << json_escape(outputs[i]) << "\"";
    }
    cerr << "]" << endl;

    return 0;
}
```

The details that are not negotiable, because every existing generator has them:

- **First line is `// generator.cpp for <full problem title>`**, followed by a comment block giving
  a one-paragraph problem summary and then the test plan — what the cases cover and why. Write the
  plan before the code; it is the part a future maintainer actually reads.
- **`#include <bits/stdc++.h>` and `using namespace std;`.** Not a curated include list.
- **`json_escape` verbatim**, comment included. Do not rename it, inline it, or "improve" it.
- **`std::mt19937_64 rng(123456789); // fixed seed for reproducibility`** — that literal seed, as the
  first line of `main`. Re-running the generator must reproduce the data byte for byte, or the
  stored source stops matching the stored data. Never use `random_device`, time, or `rand()`.
- **Section banners** in the `// -------- Name --------` form, in this order: official samples
  verbatim first, then hand-crafted edge cases, then randomised cases.
- **Emit stdout first, then stderr**, both with `", "` between elements and `<< endl` at the close.
- **`return 0;`** explicitly.
- Named-argument comments at call sites when a helper takes several scalars —
  `make_case(/*D*/ 25, /*E*/ 15, /*Q_MAX*/ 30, /*bake_bias*/ 0.5, rng)`. `ccc25j2` does this
  throughout and it is worth copying.

## Getting the test data right

- **No trailing newline inside an input string.** Build the last line without one — `ccc25j2` does
  this deliberately (`if (i + 1 < E) in += '\n';`). Same for expected outputs. The default compare
  mode is `trim-trailing` so a stray `\n` would be forgiven, but the stored data should be clean.
- **The generator computes the expected output itself.** Either it constructs cases whose answer is
  known by construction, or it embeds a reference implementation. Never hand-type expected outputs
  for anything but the official samples.
- **Respect the marks breakdown.** Where a problem states how marks are distributed, each mark is
  one test case, and the cases in each group must honour that group's constraints. A 15-mark CCC
  junior problem gets 15 cases, grouped as the statement describes.
- **Include every official sample verbatim**, with its official expected output. If a sample fails,
  the statement and the generator disagree and one of them is wrong.
- Cover the degenerate shapes the statement permits: minimum values, a single element, all-equal
  values, the largest legal value, and whatever "empty" means for this problem.
- Randomised cases should scale toward the stated constraints, not sit at the same size as the
  hand-written ones. Random cases that are all tiny prove nothing about the intended complexity.

## Sizing for Render — the part that actually bites

`/generate-tests` gives the generator 60 s and 1 GB, which is generous. `/submit` is where the
constraint lives, and the data you generate has to survive it forever after. Before you write the
generator, work out roughly how many bytes each case will be and multiply.

- A case at the top of the stated constraints is often far too big. `N ≤ 2×10^5` integers of up to
  10 digits is ~2 MB in one case — over the 1 MB per-case cap, so the problem would 413 and become
  permanently unsubmittable. Cap `N` at whatever keeps the case under ~150 KB and say so in the
  test-plan comment.
- Two problems on WMOJ already fell into exactly this trap (`WOSS TriOlympiad: S2` at 1,477,908
  bytes, `WOSS TriOlympiad: J3` at 1,001,009 bytes). Both are live, both have zero submissions,
  because every submission 413s before anything compiles. Do not add a third.
- Prefer fewer, well-chosen cases over many similar ones. The working problems on WMOJ run 8–65
  cases and average about 33.
- Print numbers, not padding. Space-separated is denser than newline-separated for long sequences,
  and matters at scale.

See SKILL.md for the concrete budget these rules are derived from.
