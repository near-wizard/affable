"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { blogPosts, getPostBySlug, getAllCategories, BlogPost } from "@/content/blog/blogs"
import ReactMarkdown from "react-markdown"
import { ChevronLeft, BookOpen, Calendar, User, Search } from "lucide-react"

interface BlogContentProps {
  blogPosts: BlogPost[]
  initialSlug?: string
  onNavigate?: (slug?: string) => void
}

const categoryColors: Record<string, { badge: string; gradient: string; icon: string }> = {
  "Engineering": {
    badge: "bg-blue-100 text-blue-700",
    gradient: "from-blue-50 to-blue-100",
    icon: "⚙️"
  },
  "Product": {
    badge: "bg-purple-100 text-purple-700",
    gradient: "from-purple-50 to-purple-100",
    icon: "🚀"
  },
  "Marketing": {
    badge: "bg-pink-100 text-pink-700",
    gradient: "from-pink-50 to-pink-100",
    icon: "📢"
  },
  "Design": {
    badge: "bg-amber-100 text-amber-700",
    gradient: "from-amber-50 to-amber-100",
    icon: "🎨"
  },
  "Strategy": {
    badge: "bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-50 to-emerald-100",
    icon: "📊"
  },
  "Getting Started": {
    badge: "bg-cyan-100 text-cyan-700",
    gradient: "from-cyan-50 to-cyan-100",
    icon: "🌱"
  }
}

export function BlogContent({ blogPosts, initialSlug, onNavigate }: BlogContentProps) {
  const getPostBySlug = (slug: string) => blogPosts.find(post => post.slug === slug)
  const getAllCategories = () => Array.from(new Set(blogPosts.map(post => post.category)))

  const [view, setView] = useState<'list' | 'article'>(initialSlug ? 'article' : 'list')
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(
    initialSlug ? getPostBySlug(initialSlug) || null : null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>(blogPosts)
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let results = blogPosts

    // Apply category filter
    if (filterCategory !== 'all') {
      results = results.filter(post => post.category === filterCategory)
    }

    // Apply search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      results = results.filter(post =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.excerpt.toLowerCase().includes(lowerQuery) ||
        post.content.toLowerCase().includes(lowerQuery) ||
        post.author.toLowerCase().includes(lowerQuery)
      )
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }

    setFilteredPosts(results)
  }, [searchQuery, filterCategory])

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
      onNavigate(undefined)
    }
  }

  if (view === 'article' && currentPost) {
    const categoryInfo = categoryColors[currentPost.category] || categoryColors['Getting Started']
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Premium Header with Gradient Background */}
        <div className={`bg-gradient-to-r ${categoryInfo.gradient} border-b border-gray-200 p-6 shadow-sm`}>
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to all posts</span>
          </button>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{categoryInfo.icon}</span>
                <span className={`${categoryInfo.badge} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide`}>
                  {currentPost.category}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                {currentPost.title}
              </h1>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">{currentPost.author}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">{currentPost.date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900">{currentPost.readTime} min read</span>
            </div>
          </div>
        </div>

        {/* Premium Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <article className="prose prose-lg prose-slate max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:text-rose-600 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-strong:text-gray-900 prose-em:text-gray-700">
              <ReactMarkdown>{currentPost.content}</ReactMarkdown>
            </article>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Premium Header */}
      <div className="border-b border-gray-200 p-6 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        </div>
        <p className="text-base text-gray-600 mb-6 max-w-2xl">
          Expert insights on affiliate programs, partner marketing, and building world-class integration platforms.
        </p>

        {/* Premium Search Bar */}
        <div ref={searchRef} className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, topic, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowAutocomplete(true)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
            />

            {/* Premium Autocomplete Dropdown */}
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-10">
                {filteredPosts?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredPosts.map(post => {
                      const catInfo = categoryColors[post.category] || categoryColors['Getting Started']
                      return (
                        <button
                          key={post.slug}
                          onClick={() => handlePostClick(post)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg">{catInfo.icon}</span>
                            <span className={`${catInfo.badge} px-2 py-0.5 rounded-full text-xs font-semibold uppercase`}>
                              {post.category}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{post.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{post.excerpt}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <p className="text-sm">No posts found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category Filter - Premium Styled */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              filterCategory === 'all'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            All Posts
          </button>
          {getAllCategories().sort().map(category => {
            const catInfo = categoryColors[category] || categoryColors['Getting Started']
            return (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                  filterCategory === category
                    ? `${catInfo.badge} shadow-md`
                    : `bg-white text-gray-700 border border-gray-300 hover:bg-gray-100`
                }`}
              >
                <span>{catInfo.icon}</span>
                <span className="capitalize text-sm">{category}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Premium Post Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredPosts?.length > 0 ? (
          <div className="grid gap-4 max-w-4xl">
            {filteredPosts.map(post => {
              const catInfo = categoryColors[post.category] || categoryColors['Getting Started']
              return (
                <button
                  key={post.slug}
                  onClick={() => handlePostClick(post)}
                  className={`text-left p-5 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-blue-200 transition-all group cursor-pointer bg-gradient-to-r ${catInfo.gradient}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl flex-shrink-0">{catInfo.icon}</span>
                        <span className={`${catInfo.badge} px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
                          {post.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {post.title}
                      </h3>
                    </div>
                  </div>

                  {/* Excerpt and Metadata Row */}
                  <p className="text-gray-700 mb-3 line-clamp-2">{post.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-3 border-b border-gray-200 border-opacity-50">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{post.date}</span>
                    </div>
                    <div className="text-gray-700">{post.readTime} min read</div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <BookOpen className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-700">No posts match your filters</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
