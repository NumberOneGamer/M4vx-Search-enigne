import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://m4vx-search.pages.dev';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/status`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.3 },
  ];
}
