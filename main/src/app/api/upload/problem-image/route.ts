import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';
import { getManagerSupabase } from '@/lib/managerAuth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// The single source of truth for what is accepted and what extension the
// stored object gets. Deriving the extension from the validated MIME type
// rather than the client-supplied filename matters: `a./x/y` as a filename
// produced an object path of `<uid>/<ts>-<id>./x/y`, silently creating
// directories inside the bucket.
const EXTENSION_BY_TYPE: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
    try {
        // Auth: must be admin or manager
        let supabase, user;
        const adminResult = await getAdminSupabase(request);
        if ('error' in adminResult) {
            const managerResult = await getManagerSupabase(request);
            if ('error' in managerResult) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            supabase = managerResult.supabase;
            user = managerResult.user;
        } else {
            supabase = adminResult.supabase;
            user = adminResult.user;
        }

        // A malformed multipart body throws here. Without the surrounding
        // try/catch that surfaced as Next's raw HTML 500 page to a caller
        // (MarkdownEditor) that does `await res.json()` on the response.
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const ext = EXTENSION_BY_TYPE[file.type];
        if (!ext) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
        }

        const timestamp = Date.now();
        const uniqueId = crypto.randomUUID().slice(0, 8);
        const path = `${user.id}/${timestamp}-${uniqueId}.${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
            .from('problem_images')
            .upload(path, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
        }

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problem_images/${path}`;

        return NextResponse.json({ url });
    } catch (err) {
        console.error('Problem image upload error:', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
