import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://affablelink.com/', lastModified: new Date() },
    { url: 'https://affablelink.com/about', lastModified: new Date() },
    { url: 'https://affablelink.com/features', lastModified: new Date() },
    { url: 'https://affablelink.com/rfd', lastModified: new Date() },
    { url: 'https://affablelink.com/pricing', lastModified: new Date() },
  ];
}
