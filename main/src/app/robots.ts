import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wmoj.ca';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/manager/', '/api/'],
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
