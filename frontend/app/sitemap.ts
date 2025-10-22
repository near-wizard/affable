import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://affablelink.com';
  const now = new Date();

  // Main pages
  const mainPages = [
    { url: `${baseUrl}/`, priority: 1.0, changefreq: 'weekly' as const },
    { url: `${baseUrl}/about`, priority: 0.9, changefreq: 'monthly' as const },
    { url: `${baseUrl}/features`, priority: 0.9, changefreq: 'monthly' as const },
    { url: `${baseUrl}/pricing`, priority: 0.9, changefreq: 'monthly' as const },
    { url: `${baseUrl}/rfd`, priority: 0.8, changefreq: 'weekly' as const },
    { url: `${baseUrl}/blog`, priority: 0.8, changefreq: 'weekly' as const },
  ];

  // Individual RFD pages (4 RFDs currently)
  const rfdPages = [
    { url: `${baseUrl}/rfd/1`, priority: 0.7, changefreq: 'monthly' as const, title: 'RFD 1: Requests for Discussion' },
    { url: `${baseUrl}/rfd/2`, priority: 0.7, changefreq: 'monthly' as const, title: 'RFD 2: Deep Linking Without Next.js Router' },
    { url: `${baseUrl}/rfd/3`, priority: 0.7, changefreq: 'monthly' as const, title: 'RFD 3: Market Segmentation Through UI Design' },
    { url: `${baseUrl}/rfd/4`, priority: 0.7, changefreq: 'monthly' as const, title: 'RFD 4: Designing a Scalable Affiliate Tracking Database' },
  ];

  // Blog posts (will grow as posts are published)
  const blogPages = [
    { url: `${baseUrl}/blog/launch-affiliate-program-24-hours`, priority: 0.65, changefreq: 'monthly' as const },
    { url: `${baseUrl}/blog/affiliate-fraud-detection`, priority: 0.65, changefreq: 'monthly' as const },
    { url: `${baseUrl}/blog/affiliate-pricing-models`, priority: 0.65, changefreq: 'monthly' as const },
    { url: `${baseUrl}/blog/why-windows95-interface`, priority: 0.65, changefreq: 'monthly' as const },
    { url: `${baseUrl}/blog/seo-friendly-modern-applications`, priority: 0.65, changefreq: 'monthly' as const },
  ];

  // Combine all pages with lastModified
  const allPages = [
    ...mainPages.map(page => ({
      ...page,
      lastModified: now,
    })),
    ...rfdPages.map(page => ({
      url: page.url,
      priority: page.priority,
      changefreq: page.changefreq,
      lastModified: now,
    })),
    ...blogPages.map(page => ({
      ...page,
      lastModified: now,
    })),
  ];

  return allPages as MetadataRoute.Sitemap;
}
