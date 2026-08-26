import { MetadataRoute } from 'next';
import { getServerSupabase } from '@/lib/supabaseServer';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wmoj.ca';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const routes = ['', '/auth/login', '/auth/register', '/contests', '/problems'].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }));

    try {
        const supabase = await getServerSupabase();

        // 2. Fetch Contests
        const { data: contests } = await supabase
            .from('contests')
            .select('id, updated_at')
            .eq('is_active', true);

        const contestRoutes = (contests || []).map((contest) => ({
            url: `${BASE_URL}/contests/${contest.id}`,
            lastModified: contest.updated_at || new Date().toISOString(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

        // 3. Fetch Problems
        // `is_active` is NOT optional here. Without it the sitemap publishes every
        // UNPUBLISHED problem's slug to search engines and to anyone who opens
        // /sitemap.xml — handing out the ids of problems being drafted for an
        // upcoming contest, which is exactly the set that most needs to stay quiet.
        const { data: problems } = await supabase
            .from('problems')
            .select('id, updated_at')
            .eq('is_active', true);

        const problemRoutes = (problems || []).map((problem) => ({
            url: `${BASE_URL}/problems/${problem.id}`,
            lastModified: problem.updated_at || new Date().toISOString(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

        return [...routes, ...contestRoutes, ...problemRoutes];
    } catch (error) {
        console.error('Sitemap generation error (Supabase likely not configured or reachable):', error);
        // Return at least the static routes so sitemap doesn't 500
        return routes;
    }
}
