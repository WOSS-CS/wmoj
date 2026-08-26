import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'problem_images';
const STORAGE_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

// Statements embed figures two ways, both of which MarkdownRenderer renders and
// both of which the add-problem skill documents:
//   <img size="100" src="…/problem_images/<key>" />   (the editor's paste flow)
//   ![alt](…/problem_images/<key>)                    (plain Markdown)
// Matching only the first orphaned every Markdown-embedded figure in the
// bucket, permanently and untraceably, when its problem was deleted.
const HTML_IMG_SRC = /<img\s[^>]*src=["']([^"']*?)["'][^>]*\/?>/gi;
const MARKDOWN_IMG_SRC = /!\[[^\]]*\]\(\s*<?([^)\s<>]+)>?/g;

/**
 * Turn one `src` into a bucket key, or null if it does not point at this bucket.
 * Strips any `?query`/`#hash` (a signed or cache-busted URL still names the same
 * object) and decodes %xx escapes, because storage.remove() takes a raw key.
 */
function toBucketKey(src: string): string | null {
    const idx = src.indexOf(STORAGE_PREFIX);
    if (idx === -1) return null;
    let key = src.substring(idx + STORAGE_PREFIX.length);
    const cut = Math.min(
        ...[key.indexOf('?'), key.indexOf('#')].filter((i) => i !== -1),
        key.length,
    );
    key = key.substring(0, cut);
    if (!key) return null;
    try {
        return decodeURIComponent(key);
    } catch {
        return key; // malformed escape — hand storage the literal key
    }
}

/**
 * Extract storage keys for images in the problem_images bucket from markdown
 * content. Handles both `<img src="…">` and `![alt](…)`, and de-duplicates:
 * storage.remove() with a repeated key is wasteful, and the same figure is
 * often referenced twice in one statement.
 */
export function extractImagePaths(content: string): string[] {
    const paths = new Set<string>();

    for (const regex of [HTML_IMG_SRC, MARKDOWN_IMG_SRC]) {
        regex.lastIndex = 0; // these are module-level /g regexes — reset before each scan
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
            const key = toBucketKey(match[1]);
            if (key) paths.add(key);
        }
    }

    return [...paths];
}

/**
 * Delete all problem_images bucket files referenced in the given content.
 * Best-effort: logs errors but does not throw.
 */
export async function deleteProblemImages(supabase: SupabaseClient, content: string): Promise<void> {
    const paths = extractImagePaths(content);
    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
        console.error('Failed to clean up problem images:', error.message, paths);
    }
}
