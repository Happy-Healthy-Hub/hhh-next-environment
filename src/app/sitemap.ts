import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://hhh.foundation',
      lastModified: new Date('2026-11-21'),
      changeFrequency: 'monthly',
      priority: 1,
      images: [
        'https://hhh.foundation/images/hhh-hero.webp',
        'https://hhh.foundation/images/hhh-companionship.webp',
        'https://hhh.foundation/images/hhh-academy.webp',
      ],
    },
  ];
}
