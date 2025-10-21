// app/api/rfds/route.ts
import { getAllRFDs } from '@/lib/rfd-loader'
import { NextResponse } from 'next/server'

export async function GET() {
  const rfds = getAllRFDs()
  return NextResponse.json(rfds)
}