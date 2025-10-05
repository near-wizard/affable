"use client"

import { useState, useEffect, useRef } from "react"
import { blogPosts, getPostBySlug, searchPosts, BlogPost } from "@/data/blog-posts"
import ReactMarkdown from "react-markdown"

interface BlogContentProps {
  initialSlug?: string
  onNavigate?: (slug: string) => void
}

export function BlogContent({ initialSlug, onNavigate }: BlogContentProps) {
  const [view, setView] = useState<'list' | 'article'>(initialSlug ? 'article' : 'list')
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(
    initialSlug ? getPostBySlug(initialSlug) || null : null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>(blogPosts)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery) {
      const results = searchPosts(searchQuery)
      setFilteredPosts(results)
      setShowAutocomplete(true)
    } else {
      setFilteredPosts(blogPosts)
      setShowAutocomplete(false)
    }
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePostClick = (post: BlogPost) => {
    setCurrentPost(post)
    setView('article')
    setSearchQuery("")
    setShowAutocomplete(false)
    if (onNavigate) {
      onNavigate(post.slug)
    }
  }

  const handleBackToList = () => {
    setView('list')
    setCurrentPost(null)
    if (onNavigate) {
      onNavigate('')
    }
  }

  if (view === 'article' && currentPost) {
    return (
      <div className="flex flex-col h-full">
        {/* Article Header */}
        <div className="border-b border-gray-300 p-4 bg-gray-50">
          <button
            onClick={handleBackToList}
            className="text-blue-600 hover:underline mb-3 flex items-center gap-1"
          >
            ← Back to all posts
          </button>
          <h1 className="text-2xl font-bold mb-2">{currentPost.title}</h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{currentPost.date}</span>
            <span>{currentPost.readTime}</span>
          </div>
          <div className="flex gap-2 mt-2">
            {currentPost.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Article Content */}
        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
          <ReactMarkdown>{currentPost.content}</ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="border-b border-gray-300 p-4 bg-gray-50" ref={searchRef}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search blog posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowAutocomplete(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Autocomplete Dropdown */}
          {showAutocomplete && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto z-10">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <button
                    key={post.slug}
                    onClick={() => handlePostClick(post)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="font-medium">{post.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{post.description}</div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-gray-500 text-center">
                  No posts found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Blog Post List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPosts.map(post => (
          <button
            key={post.slug}
            onClick={() => handlePostClick(post)}
            className="w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-bold mb-1">{post.title}</h2>
            <p className="text-sm text-gray-600 mb-2">{post.description}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{post.date}</span>
              <span>•</span>
              <span>{post.readTime}</span>
              <span>•</span>
              <div className="flex gap-1">
                {post.tags.map(tag => (
                  <span key={tag} className="text-blue-600">#{tag}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}