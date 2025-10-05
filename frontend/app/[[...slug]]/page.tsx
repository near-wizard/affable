'use client'
import { Desktop } from "@/components/desktop"
import { useEffect } from 'react'
import { getRFDByNumber } from "@/content/rfd/rfds"
import { loadPostHog } from "@/utils/posthogLazyLoader"

export default function Home(params: { slug?: string[] }) {

  useEffect(() => {
    loadPostHog().then((ph) => {
      if (ph) {
        ph.capture('landing_page_view')
      }
    })
  }, [])

  const [mainSlug, subSlug] = params.slug || []
  console.log(mainSlug,subSlug)

  return (
    <main className="min-h-screen">
        <Desktop initialSlug={mainSlug} initialSubSlug={subSlug} />

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