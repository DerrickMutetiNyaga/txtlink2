'use client'

import React from 'react'
import { Search } from 'lucide-react'

interface IndustryFilterBarProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'banking', label: 'Banking' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'government', label: 'Government' },
  { id: 'telecom', label: 'Telecom' },
]

export function IndustryFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: IndustryFilterBarProps) {
  return (
    <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200 py-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  activeFilter === filter.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search industry…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
          />
        </div>
      </div>
    </div>
  )
}

