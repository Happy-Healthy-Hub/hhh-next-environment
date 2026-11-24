import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://hhh.foundation/sitemap.xml',
    host: 'https://hhh.foundation',
  };
}
