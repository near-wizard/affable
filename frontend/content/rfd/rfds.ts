// content/rfd/rfds.ts
// This file contains manually maintained RFD entries
// (loaded from markdown files in content/rfd/*.md)

export type RFDState = 'prediscussion' | 'ideation' | 'discussion' | 'published' | 'committed' | 'abandoned'

export interface RFD {
	number: number
	title: string
	state: RFDState
	discussion?: string
	authors: string[]
	date: string
	labels: string[]
	content: string
}

// RFDs for Affable
export const rfds: RFD[] = [
  {
    number: 1,
    title: "RFD 1: Requests for Discussion",
    state: "committed",
    discussion: "https://github.com/near-wizard/affable/discussions/17",
    authors: ["Jared Butler"],
    date: "2025-10-05",
    labels: ["meta"],
    content: `# RFD 1: Requests for Discussion

A Request for Discussion (RFD) is a design document that proposes a new feature, architecture decision, or significant change to Affable. It's inspired by Oxide's RFD process.

See the full RFD in the discussions linked above.`
  },
  {
    number: 2,
    title: "RFD 2: Deep Linking Without Next.js Router",
    state: "committed",
    discussion: "https://github.com/near-wizard/affable/discussions/2",
    authors: ["Jared Butler"],
    date: "2025-10-05",
    labels: ["frontend", "architecture"],
    content: `# RFD 2: Deep Linking Without Next.js Router

Our Windows 95-style desktop UI needs deep linking for SEO and shareability, but Next.js router's navigation lifecycle conflicts with our client-side window management state.

We use window.history.replaceState() directly for client-side navigation instead.

See the full RFD in the discussions linked above.`
  },
  {
    number: 3,
    title: "RFD 3: Market Segmentation Through UI Design",
    state: "discussion",
    discussion: "https://github.com/near-wizard/affable/discussions/3",
    authors: ["Jared Butler"],
    date: "2025-10-05",
    labels: ["product", "strategy"],
    content: `# RFD 3: Market Segmentation Through UI Design

The Windows 95 desktop UI isn't just aesthetic—it's a deliberate filter for our target market in the early stages.

By launching with a polarizing UI, we self-select for early adopters who value substance over conventional UX.

See the full RFD in the discussions linked above.`
  },
  {
    number: 4,
    title: "RFD 4: Designing a Scalable Affiliate Tracking Database: Key Tradeoffs and Considerations",
    state: "discussion",
    discussion: "https://github.com/near-wizard/affable/discussions/1",
    authors: ["Jared Butler"],
    date: "2025-10-05",
    labels: ["backend", "database"],
    content: `# RFD 4: Designing a Scalable Affiliate Tracking Database: Key Tradeoffs and Considerations

When building an affiliate tracking platform, the database schema is the foundation that determines system performance, flexibility, and maintainability.

Key design decisions include:
- Campaign versioning for audit trails and compliance
- Multi-touch attribution architecture
- Scalable partner performance tracking

See the full RFD in the discussions linked above.`
  }
]
