import { Desktop } from "@/components/desktop"

export default function Page({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.[0] ?? null
  return <Desktop initialSlug={slug} />
}