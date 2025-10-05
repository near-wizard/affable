
export type RFDState = 'prediscussion' | 'ideation' | 'discussion' | 'published' | 'committed' | 'abandoned'

export interface RFD {
  number: number
  title: string
  state: RFDState
  discussion: string // GitHub discussion URL
  authors: string[]
  date: string
  labels: string[]
  content: string
}

export const rfds: RFD[] = [
  {
    number: 1,
    title: "RFD 1: Requests for Discussion",
    state: "committed",
    discussion: "https://github.com/near-wizard/affable/discussions/1",
    authors: ["Jared Butler"],
    date: "2025-10-05",
    labels: ["meta"],
    content: `# RFD 1: Requests for Discussion

## What is an RFD?

A Request for Discussion (RFD) is a design document that proposes a new feature, architecture decision, or significant change to Affable. It's inspired by [Oxide's RFD process](https://rfd.shared.oxide.computer/).

## Why RFDs?

Building in public means documenting our thinking. RFDs help us:

- Think through problems systematically
- Get feedback early from the community
- Create a historical record of why we made decisions
- Avoid repeating past mistakes

## RFD Lifecycle

### Prediscussion
Early stage idea. Not ready for full discussion yet.

### Ideation
Author is actively working on the RFD. Open for early feedback.

### Discussion
RFD is ready for broader input. This is where the real debate happens.

### Published
Discussion has concluded. RFD represents current thinking but isn't implemented yet.

### Committed
RFD has been implemented or the decision has been made and locked in.

### Abandoned
We decided not to pursue this. Still valuable as documentation of "roads not taken."

## How to Contribute

1. Check existing RFDs to avoid duplicates
2. Open a GitHub Discussion to gauge interest
3. Write your RFD (copy this template)
4. Submit a PR to add it to the RFD list
5. Engage with feedback
6. Update based on discussion

Let's build this thing transparently!`
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

## Problem Statement

Our Windows 95-style desktop UI needs deep linking for SEO and shareability, but Next.js router's navigation lifecycle conflicts with our client-side window management state.

## Background

We're building a retro desktop interface where "windows" are React components managed entirely in client-side state. When a user clicks an icon, we want to:

1. Open a window with smooth animations
2. Update the URL for sharing (e.g., \`/about\`)
3. Enable search engines to crawl each "window" as a page
4. NOT trigger full page re-renders

## Attempted Solutions

### Attempt 1: Shallow Routing
Used \`router.push(url, { shallow: true })\` but this still triggered component re-renders that reset our window state.

### Attempt 2: router.replace with setTimeout
Tried debouncing the router call but still had race conditions.

### Attempt 3: useRef to prevent re-initialization
Helped but didn't solve the core issue of router-triggered re-renders.

## Proposed Solution

Use \`window.history.replaceState()\` directly instead of Next.js router for client-side navigation.

\`\`\`typescript
const openWindow = (type: string) => {
  setWindows(prev => [...prev, newWindow])
  window.history.replaceState({}, '', \`/\${type}\`)
}
\`\`\`

## Why This Works

- **No framework overhead**: Direct browser API doesn't trigger Next.js lifecycle
- **SEO preserved**: Initial page load still uses Next.js SSR with proper metadata
- **Deep linking works**: URLs are real and shareable
- **State is stable**: No unexpected re-renders

## Trade-offs

**Pros:**
- Simpler code
- Predictable behavior
- Better performance (no router overhead)

**Cons:**
- Can't use Next.js router features (prefetching, middleware)
- Have to manually manage history state
- Diverges from "Next.js way"

## Decision

Implemented in [commit c505281](https://github.com/near-wizard/affable/commit/c505281ca77974ad680f003ea11ef4501e5bbc3e).

This works perfectly for our use case. We're building an SPA-like experience where the router's features aren't needed. Sometimes the best framework solution is no framework.

## See Also

- Blog post: "Windows 95 Meets Next.js: A Deep Linking Adventure Through Router Hell"`
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

## Hypothesis

The Windows 95 desktop UI isn't just aesthetic—it's a deliberate filter for our target market in the early stages.

## Target Early Users

Who we WANT:
- PostHog users (familiar with their retro UI)
- Technical founders who appreciate nostalgia
- Developers who value "building in public" transparency
- People who get excited by unconventional design

Who we DON'T want (yet):
- Enterprise buyers expecting "professional" SaaS
- Non-technical users who need hand-holding
- People who judge tools by visual polish alone

## The Reasoning

By launching with a polarizing UI, we:

1. **Self-select for early adopters** who value substance over conventional UX
2. **Create a memorable brand** in a sea of identical SaaS tools
3. **Buy time** to nail the core product before scaling to mainstream
4. **Build a community** of people who "get it"

## Risks

- Might alienate potential advocates
- Could be seen as unprofessional
- Accessibility concerns (we need to address this)
- Might paint us into a corner UI-wise

## Open Questions

1. When do we know it's time to "professionalize"?
2. How do we balance nostalgia with accessibility?
3. Can we A/B test to validate this hypothesis?
4. What metrics indicate this strategy is working/failing?

## Discussion Needed

I'm putting this out there because it's a bet. Maybe I'm rationalizing a fun design choice with post-hoc product thinking. Or maybe this is actually smart positioning.

What do you think?`
  }
]

export function getRFDByNumber(number: number): RFD | undefined {
  return rfds.find(rfd => rfd.number === number)
}

export function searchRFDs(query: string): RFD[] {
  const lowerQuery = query.toLowerCase()
  return rfds.filter(rfd => 
    rfd.title.toLowerCase().includes(lowerQuery) ||
    rfd.content.toLowerCase().includes(lowerQuery) ||
    rfd.labels.some(label => label.toLowerCase().includes(lowerQuery)) ||
    rfd.authors.some(author => author.toLowerCase().includes(lowerQuery))
  )
}

export function getRFDsByState(state: RFDState): RFD[] {
  return rfds.filter(rfd => rfd.state === state)
}
