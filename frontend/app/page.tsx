'use client'
import { Desktop } from "@/components/desktop"
import { useEffect } from 'react'
import { loadPostHog } from "@/utils/posthogLazyLoader"

export default function Home() {

  useEffect(() => {
    loadPostHog().then((ph) => {
      if (ph) {
        ph.capture('landing_page_view')
      }
    })
  }, [])


  return (
    <main className="min-h-screen">
      <Desktop />
    </main>
  )
}
