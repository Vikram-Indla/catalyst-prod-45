import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
  sublabel?: string
  badge?: string
}

interface MultiSelectDropdownProps {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyMessage?: string
  accentColor?: string
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  emptyMessage = 'No options available',
  accentColor = '#2563EB',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    )
  }

  const accentBg = accentColor === '#7C3AED' ? '#F5F3FF' : 'rgba(59,130,246,0.06)'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(237,237,237,0.40)', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'Geist, -apple-system, sans-serif' }}>
          {label}
        </label>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            style={{ fontSize: '10px', color: accentColor, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Geist, -apple-system, sans-serif', fontWeight: 600 }}
          >
            Clear all
          </button>
        )}
      </div>

      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Trigger */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--bd-default, rgba(255,255,255,0.10))',
            background: 'var(--bg-app, #fff)', cursor: 'pointer', minHeight: '50px', gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
            {selected.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'rgba(237,237,237,0.40)', fontFamily: 'Geist, -apple-system, sans-serif' }}>{placeholder}</span>
            ) : selected.length <= 3 ? (
              selected.map(v => {
                const opt = options.find(o => o.value === v)
                return (
                  <span
                    key={v}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                      background: accentBg, color: accentColor, fontFamily: 'Geist, -apple-system, sans-serif',
                    }}
                  >
                    {opt?.label || v}
                    <X
                      size={10}
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                      onClick={(e) => { e.stopPropagation(); toggle(v) }}
                    />
                  </span>
                )
              })
            ) : (
              <span style={{ fontSize: '12px', color: accentColor, fontWeight: 600, fontFamily: 'Geist, -apple-system, sans-serif' }}>
                {selected.length} selected
              </span>
            )}
          </div>
          <ChevronDown size={14} style={{ color: 'rgba(237,237,237,0.40)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
            background: 'var(--bg-app, #fff)', border: '1px solid var(--bd-default, rgba(255,255,255,0.10))', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 9999, overflow: 'hidden',
          }}>
            {/* Search */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={13} style={{ color: 'rgba(237,237,237,0.40)', flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  border: 'none', outline: 'none', width: '100%',
                  fontSize: '12px', fontFamily: 'Geist, -apple-system, sans-serif', color: 'rgba(237,237,237,0.53)',
                  background: 'transparent',
                }}
              />
            </div>

            {/* Select All / Deselect All */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #1A1A1A', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => onChange(filtered.map(o => o.value))}
                style={{ fontSize: '10px', color: accentColor, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Geist, -apple-system, sans-serif', fontWeight: 600 }}
              >
                Select all{search ? ' visible' : ''}
              </button>
              <button
                onClick={() => onChange([])}
                style={{ fontSize: '10px', color: 'rgba(237,237,237,0.40)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Geist, -apple-system, sans-serif', fontWeight: 600 }}
              >
                Deselect all
              </button>
            </div>

            {/* Options */}
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {options.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'rgba(237,237,237,0.40)', fontStyle: 'italic' }}>
                  {emptyMessage}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'rgba(237,237,237,0.40)' }}>
                  No matches for "{search}"
                </div>
              ) : (
                filtered.map(opt => {
                  const isSelected = selected.includes(opt.value)
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggle(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', cursor: 'pointer',
                        background: isSelected ? accentBg : 'transparent',
                        transition: 'background .1s',
                      }}
                      onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-1, #1A1A1A)' }}
                      onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
                        border: isSelected ? `2px solid ${accentColor}` : '2px solid rgba(237,237,237,0.53)',
                        background: isSelected ? accentColor : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '12px', color: 'rgba(237,237,237,0.53)', fontFamily: 'Geist, -apple-system, sans-serif', fontWeight: isSelected ? 600 : 400 }}>
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span style={{ fontSize: '10px', color: 'rgba(237,237,237,0.40)', marginLeft: '6px', fontFamily: 'Geist, -apple-system, sans-serif' }}>
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <span style={{ fontSize: '9px', color: '#10B981', fontWeight: 600 }}>{opt.badge}</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
