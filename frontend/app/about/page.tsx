// app/about/page.tsx
import { AboutContent } from '@/components/window-content/about'

// Metadata for SEO
export const metadata = {
  title: 'About Affable',
  description: 'Affable - Partner Relationship Management for Startups',
}

export default function AboutPage() {
  return (
    <>
      {/* Canonical URL for SEO */}
      <head>
        <link rel="canonical" href="https://affablelink.com/about" />
      </head>

      {/* Main content */}
      <main className="max-w-3xl mx-auto py-12 px-4">
        <AboutContent />
      </main>
    </>
  )
}
