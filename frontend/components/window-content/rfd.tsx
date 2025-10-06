"use client"

import { useState, useEffect, useRef } from "react"
import { rfds, getRFDByNumber, searchRFDs, getRFDsByState, RFD, RFDState } from "@/content/rfd/rfds"
import ReactMarkdown from "react-markdown"

interface RFDContentProps {
  initialNumber?: number
  onNavigate?: (number?: number) => void
}

const stateColors: Record<RFDState, string> = {
  prediscussion: "bg-gray-200 text-gray-700",
  ideation: "bg-yellow-200 text-yellow-800",
  discussion: "bg-blue-200 text-blue-800",
  published: "bg-green-200 text-green-800",
  committed: "bg-purple-200 text-purple-800",
  abandoned: "bg-red-200 text-red-800"
}

export function RFDContent({ initialNumber, onNavigate }: RFDContentProps) {
  const [view, setView] = useState<'list' | 'document'>(initialNumber ? 'document' : 'list')
  const [currentRFD, setCurrentRFD] = useState<RFD | null>(
    initialNumber ? getRFDByNumber(initialNumber) || null : null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [filteredRFDs, setFilteredRFDs] = useState<RFD[]>(rfds)
  const [filterState, setFilterState] = useState<RFDState | 'all'>('all')
  const searchRef = useRef<HTMLDivElement>(null)
  console.log("initial number", initialNumber, view)

  useEffect(() => {
    let results = rfds
    
    // Apply state filter
    if (filterState !== 'all') {
      results = getRFDsByState(filterState)
    }
    
    // Apply search query
    if (searchQuery) {
      results = searchRFDs(searchQuery).filter(rfd => 
        filterState === 'all' || rfd.state === filterState
      )
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
    
    setFilteredRFDs(results)
  }, [searchQuery, filterState])

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
    return (
      <div className="flex flex-col h-full">
        {/* RFD Header */}
        <div className="border-b border-gray-300 p-4 bg-gray-50">
          <button
            onClick={handleBackToList}
            className="text-blue-600 hover:underline mb-3 flex items-center gap-1"
          >
            ← Back to all RFDs
          </button>
          
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold flex-1">
              RFD {currentRFD.number}: {currentRFD.title.replace(`RFD ${currentRFD.number}: `, '')}
            </h1>
            <span className={`px-3 py-1 rounded text-sm font-medium ${stateColors[currentRFD.state]}`}>
              {currentRFD.state}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
            <span>👤 {currentRFD.authors.join(', ')}</span>
            <span>📅 {currentRFD.date}</span>
            {currentRFD.discussion && (
              <a 
                href={currentRFD.discussion}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                💬 Discussion
              </a>
            )}
          </div>
          
          <div className="flex gap-2">
            {currentRFD.labels.map(label => (
              <span
                key={label}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* RFD Content */}
        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
          <ReactMarkdown>{currentRFD.content}</ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-300 p-4 bg-gray-50">
        <h1 className="text-xl font-bold mb-1">Requests for Discussion</h1>
        <p className="text-sm text-gray-600 mb-3">
          Design documents and technical decisions made in public
        </p>
        
        {/* Search Bar */}
        <div ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search RFDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowAutocomplete(true)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Autocomplete Dropdown */}
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto z-10">
                {filteredRFDs.length > 0 ? (
                  filteredRFDs.map(rfd => (
                    <button
                      key={rfd.number}
                      onClick={() => handleRFDClick(rfd)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">RFD {rfd.number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${stateColors[rfd.state]}`}>
                          {rfd.state}
                        </span>
                      </div>
                      <div className="font-medium mt-1">{rfd.title}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-gray-500 text-center">
                    No RFDs found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* State Filter */}
        <div className="flex gap-2 mt-3 flex-wrap text-sm">
          <button
            onClick={() => setFilterState('all')}
            className={`px-3 py-1 rounded ${filterState === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            All
          </button>
          {(['prediscussion', 'ideation', 'discussion', 'published', 'committed', 'abandoned'] as RFDState[]).map(state => (
            <button
              key={state}
              onClick={() => setFilterState(state)}
              className={`px-3 py-1 rounded ${filterState === state ? stateColors[state] : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* RFD List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRFDs.length > 0 ? (
          filteredRFDs.map(rfd => (
            <button
              key={rfd.number}
              onClick={() => handleRFDClick(rfd)}
              className="w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-bold flex-1">
                  RFD {rfd.number}: {rfd.title.replace(`RFD ${rfd.number}: `, '')}
                </h2>
                <span className={`px-2 py-1 rounded text-xs font-medium ${stateColors[rfd.state]}`}>
                  {rfd.state}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span>👤 {rfd.authors.join(', ')}</span>
                <span>•</span>
                <span>📅 {rfd.date}</span>
              </div>
              
              <div className="flex gap-2">
                {rfd.labels.map(label => (
                  <span key={label} className="text-xs text-blue-600">#{label}</span>
                ))}
              </div>
            </button>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            No RFDs match the selected filter
          </div>
        )}
      </div>
    </div>
  )
}