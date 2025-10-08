import { Desktop } from "@/components/desktop"

export default function Home() {

  const staticFiles = ["favicon.ico", "robots.txt", "sitemap.xml"]
  if (staticFiles.includes(path)) {
    return null // Let Next.js static server handle it
  }

  return (
    <main className="min-h-screen">
        <Desktop />

    </main>
  )
}

/*
export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const [mainSlug, subSlug] = params.slug || []
  
  // Handle RFD metadata
  if (mainSlug === 'rfd' && subSlug) {
    const rfd = getRFDByNumber(parseInt(subSlug))
    if (rfd) {
      return {
        title: `${rfd.title} - Affable`,
        description: `RFD ${rfd.number} - State: ${rfd.state}`
      }
    }
  }
  
  // Handle RFD list
  if (mainSlug === 'rfd') {
    return {
      title: "RFDs - Affable",
      description: "Design documents and technical decisions made in public"
    }
  }
  
  // ... other metadata
}
  */
