"use client"

import { useState, useEffect, useRef } from "react"
import { RFD, RFDState } from "@/content/rfd/rfds"
import ReactMarkdown from "react-markdown"
import { ChevronLeft, Sparkles, MessageCircle, Calendar, User, Tag, ExternalLink, Search } from "lucide-react"

interface RFDContentProps {
  rfds: RFD[]  // Now passed from server component
  initialNumber?: number
  onNavigate?: (number?: number) => void
}

const stateColors: Record<RFDState, { badge: string; gradient: string; icon: string }> = {
  prediscussion: {
    badge: "bg-slate-100 text-slate-700",
    gradient: "from-slate-50 to-slate-100",
    icon: "💭"
  },
  ideation: {
    badge: "bg-amber-100 text-amber-700",
    gradient: "from-amber-50 to-amber-100",
    icon: "💡"
  },
  discussion: {
    badge: "bg-cyan-100 text-cyan-700",
    gradient: "from-cyan-50 to-cyan-100",
    icon: "💬"
  },
  published: {
    badge: "bg-emerald-100 text-emerald-700",
    gradient: "from-emerald-50 to-emerald-100",
    icon: "📚"
  },
  committed: {
    badge: "bg-violet-100 text-violet-700",
    gradient: "from-violet-50 to-violet-100",
    icon: "✅"
  },
  abandoned: {
    badge: "bg-rose-100 text-rose-700",
    gradient: "from-rose-50 to-rose-100",
    icon: "🗑️"
  }
}

export function RFDContent({ rfds, initialNumber, onNavigate }: RFDContentProps) {
  const [view, setView] = useState<'list' | 'document'>(initialNumber ? 'document' : 'list')
  const [currentRFD, setCurrentRFD] = useState<RFD | null>(
    initialNumber ? rfds.find(rfd => rfd.number === initialNumber) || null : null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [filteredRFDs, setFilteredRFDs] = useState<RFD[]>(rfds)
  const [filterState, setFilterState] = useState<RFDState | 'all'>('all')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let results = rfds
    
    // Apply state filter
    if (filterState !== 'all') {
      results = rfds.filter(rfd => rfd.state === filterState)
    }
    
    // Apply search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      results = results.filter(rfd => 
        rfd.title.toLowerCase().includes(lowerQuery) ||
        rfd.content.toLowerCase().includes(lowerQuery) ||
        rfd.labels.some(label => label.toLowerCase().includes(lowerQuery)) ||
        rfd.authors.some(author => author.toLowerCase().includes(lowerQuery))
      )
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
    
    setFilteredRFDs(results)
  }, [searchQuery, filterState, rfds])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRFDClick = (rfd: RFD) => {
    setCurrentRFD(rfd)
    setView('document')
    setSearchQuery("")
    setShowAutocomplete(false)
    if (onNavigate) {
      onNavigate(rfd.number)
    }
  }

  const handleBackToList = () => {
    setView('list')
    setCurrentRFD(null)
    if (onNavigate) {
      onNavigate(undefined)
    }
  }

  if (view === 'document' && currentRFD) {
    const stateInfo = stateColors[currentRFD.state]
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Premium Header with Gradient Background */}
        <div className={`bg-gradient-to-r ${stateInfo.gradient} border-b border-gray-200 p-6 shadow-sm`}>
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to all RFDs</span>
          </button>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{stateInfo.icon}</span>
                <span className={`${stateInfo.badge} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide`}>
                  {currentRFD.state}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                RFD {currentRFD.number}
              </h1>
              <p className="text-lg text-gray-700 mt-2">
                {currentRFD.title.replace(`RFD ${currentRFD.number}: `, '')}
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">{currentRFD.authors.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">{currentRFD.date}</span>
            </div>
            {currentRFD.discussion && (
              <div className="col-span-2 md:col-span-2">
                <a
                  href={currentRFD.discussion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Join Discussion</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Labels */}
          {currentRFD.labels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-300 border-opacity-50">
              {currentRFD.labels.map(label => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white bg-opacity-60 text-gray-700 text-xs font-medium rounded-full border border-gray-300 border-opacity-50"
                >
                  <Tag className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Premium Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <article className="prose prose-lg prose-slate max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-a:text-violet-600 prose-a:no-underline hover:prose-a:underline prose-code:text-rose-600 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-strong:text-gray-900 prose-em:text-gray-700">
              <ReactMarkdown>{currentRFD.content}</ReactMarkdown>
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
          <Sparkles className="w-6 h-6 text-violet-600" />
          <h1 className="text-3xl font-bold text-gray-900">Requests for Discussion</h1>
        </div>
        <p className="text-base text-gray-600 mb-6 max-w-2xl">
          Design decisions, architecture proposals, and technical RFDs shaped through open discussion. Read our thinking process in public.
        </p>

        {/* Premium Search Bar */}
        <div ref={searchRef} className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, topic, or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowAutocomplete(true)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white transition-all"
            />

            {/* Premium Autocomplete Dropdown */}
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-10">
                {filteredRFDs?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredRFDs.map(rfd => {
                      const rfdState = stateColors[rfd.state]
                      return (
                        <button
                          key={rfd.number}
                          onClick={() => handleRFDClick(rfd)}
                          className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg">{rfdState.icon}</span>
                            <span className="font-mono text-xs font-bold text-gray-500">RFD {rfd.number}</span>
                            <span className={`${rfdState.badge} px-2 py-0.5 rounded-full text-xs font-semibold uppercase`}>
                              {rfd.state}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{rfd.title}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <p className="text-sm">No RFDs found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* State Filter - Premium Styled */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterState('all')}
            className={`px-4 py-2 rounded-full font-medium transition-all ${
              filterState === 'all'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            All RFDs
          </button>
          {(['prediscussion', 'ideation', 'discussion', 'published', 'committed', 'abandoned'] as RFDState[]).map(state => {
            const stateInfo = stateColors[state]
            return (
              <button
                key={state}
                onClick={() => setFilterState(state)}
                className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                  filterState === state
                    ? `${stateInfo.badge} shadow-md`
                    : `bg-white text-gray-700 border border-gray-300 hover:bg-gray-100`
                }`}
              >
                <span>{stateInfo.icon}</span>
                <span className="capitalize text-sm">{state}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Premium RFD Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredRFDs?.length > 0 ? (
          <div className="grid gap-4 max-w-4xl">
            {filteredRFDs.map(rfd => {
              const rfdState = stateColors[rfd.state]
              return (
                <button
                  key={rfd.number}
                  onClick={() => handleRFDClick(rfd)}
                  className={`text-left p-5 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-violet-200 transition-all group cursor-pointer bg-gradient-to-r ${rfdState.gradient}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl flex-shrink-0">{rfdState.icon}</span>
                        <span className="font-mono text-xs font-bold text-gray-600">RFD {rfd.number}</span>
                        <span className={`${rfdState.badge} px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
                          {rfd.state}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-violet-600 transition-colors truncate">
                        {rfd.title.replace(`RFD ${rfd.number}: `, '')}
                      </h3>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3 pb-3 border-b border-gray-200 border-opacity-50">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{rfd.authors.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{rfd.date}</span>
                    </div>
                  </div>

                  {/* Labels */}
                  {rfd.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rfd.labels.map(label => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white bg-opacity-70 text-gray-700 text-xs font-medium rounded-full border border-gray-300 border-opacity-50"
                        >
                          <Tag className="w-3 h-3" />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <Sparkles className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-700">No RFDs match your filters</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}