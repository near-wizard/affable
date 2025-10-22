import { NextResponse } from 'next/server';
import { rfds } from '@/content/rfd/rfds';

/**
 * Public API endpoint for RFD content
 * Designed to be easily crawlable by search engines and LLMs
 * Returns RFD data in structured format for indexing
 */
export async function GET() {
  try {
    // Return all RFDs with full content in a structured format
    const rfdData = rfds.map(rfd => ({
      id: rfd.number,
      url: `https://affablelink.com/rfd/${rfd.number}`,
      title: rfd.title,
      state: rfd.state,
      authors: rfd.authors,
      date: rfd.date,
      labels: rfd.labels,
      discussion: rfd.discussion,
      content: rfd.content,
      lastModified: new Date().toISOString(),
    }));

    return NextResponse.json(
      {
        success: true,
        count: rfdData.length,
        data: rfdData,
        metadata: {
          description: 'Public API for AffableLink RFDs (Requests for Discussion)',
          version: '1.0',
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Robots-Tag': 'index, follow',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RFD content' },
      { status: 500 }
    );
  }
}
