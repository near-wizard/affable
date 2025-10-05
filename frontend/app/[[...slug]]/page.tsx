'use client'
import { Desktop } from "@/components/desktop"
import { useEffect } from 'react'
import { loadPostHog } from "@/utils/posthogLazyLoader"

export default function Home(params: { slug?: string[] }) {

  const slug = params.slug?.[0] ?? null

  useEffect(() => {
    loadPostHog().then((ph) => {
      if (ph) {
        ph.capture('landing_page_view')
      }
    })
  }, [])


  return (
    <main className="min-h-screen">
      return <Desktop initialSlug={slug} />
    </main>
  )
}