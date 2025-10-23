'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    // If no slug provided (root path), redirect to /desktop
    if (!params.slug || params.slug.length === 0) {
      router.replace('/desktop')
    } else {
      // If slug provided, redirect to /desktop with the slug
      const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug
      router.replace(`/desktop/${slug}`)
    }
  }, [params, router])

  // Show nothing while redirecting
  return null
}
