// app/rfd/[number]/page.tsx
import { RFDContent } from '@/components/window-content/rfd'
import { getAllRFDs, getRFDByNumber, RFD } from '@/lib/rfd-loader'
import { notFound } from 'next/navigation'

interface RFDPageProps {
  params: {
    number: string
  }
}

export default function RFDDetailPage({ params }: RFDPageProps) {
  const number = parseInt(params.number)
  const allRFDs:RFD[] = getAllRFDs()
  const rfd = getRFDByNumber(number.toString())
  
  if (!rfd) {
    notFound()
  }
  
  return <RFDContent rfds={allRFDs} initialNumber={number} />
}

// For static generation
export function generateStaticParams() {
  const rfds = getAllRFDs()
  return rfds.map(rfd => ({
    number: rfd.number.toString()
  }))
}

export function generateMetadata({ params }: RFDPageProps) {
  const number = parseInt(params.number)
  const rfd = getRFDByNumber(number)
  
  if (!rfd) return {}
  
  return {
    title: `${rfd.title} - RFD`,
    description: `RFD ${rfd.number}: ${rfd.title}`,
  }
}