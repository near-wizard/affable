// content/blog/blogs.ts
// Blog posts with inline content from markdown files
// (Similar to the RFD system)

import fs from 'fs';
import path from 'path';

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  author: string
  date: string
  readTime: number
  category: string
  icon?: string
  content: string
}

// Helper function to parse YAML frontmatter
function parseFrontmatter(content: string): { metadata: Record<string, any>, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { metadata: {}, body: content }

  const metadataStr = match[1]
  const body = match[2]

  // Simple YAML parser for our use case
  const metadata: Record<string, any> = {}
  const lines = metadataStr.split('\n')

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':')
    if (!key.trim()) continue

    let value: any = valueParts.join(':').trim()

    // Parse different types
    if (value === 'true') value = true
    else if (value === 'false') value = false
    else if (!isNaN(Number(value))) value = Number(value)
    else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)

    metadata[key.trim()] = value
  }

  return { metadata, body }
}

// Helper function to load blog post from file
function loadBlogPost(filename: string): BlogPost {
  const filepath = path.join(process.cwd(), 'content/blog', filename)
  const content = fs.readFileSync(filepath, 'utf-8')
  const { metadata, body } = parseFrontmatter(content)

  return {
    slug: metadata.slug,
    title: metadata.title,
    excerpt: metadata.excerpt,
    author: metadata.author,
    date: metadata.date,
    readTime: metadata.readTime,
    category: metadata.category,
    icon: metadata.icon,
    content: body.trim(),
  }
}

// Load all blog posts
function loadAllBlogPosts(): BlogPost[] {
  const blogDir = path.join(process.cwd(), 'content/blog')
  const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'))

  return files.map(file => loadBlogPost(file))
}

export const blogPosts: BlogPost[] = loadAllBlogPosts()

// Utility functions
export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug)
}

export function searchPosts(query: string): BlogPost[] {
  const lowerQuery = query.toLowerCase()
  return blogPosts.filter(post =>
    post.title.toLowerCase().includes(lowerQuery) ||
    post.excerpt.toLowerCase().includes(lowerQuery) ||
    post.category.toLowerCase().includes(lowerQuery) ||
    post.content.toLowerCase().includes(lowerQuery)
  )
}

export function getPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter(post => post.category === category)
}

export function getAllCategories(): string[] {
  const categories = new Set(blogPosts.map(post => post.category))
  return Array.from(categories)
}

export function getLatestPosts(count: number = 5): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
}
