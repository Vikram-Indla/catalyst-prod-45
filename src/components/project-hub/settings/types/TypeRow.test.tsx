import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TypeRow } from './TypeRow'

vi.mock('@/components/icons/WorkItemTypeIcon', () => ({
  WorkItemTypeIcon: ({ type, size }: { type: string; size?: number }) => (
    <img
      data-testid={`work-type-icon--${type.toLowerCase()}`}
      alt={type}
      style={{ width: size, height: size }}
    />
  ),
}))

const base = {
  name: 'Story',
  icon: 'story',
  color: '#0D9488',
  level: 'work',
  isEnabled: true,
  isFeatureType: false,
  featureLayerEnabled: true,
  itemCount: 5,
  onViewFields: vi.fn(),
}

describe('TypeRow', () => {
  it('renders WorkItemTypeIcon not a custom color circle', () => {
    render(<TypeRow {...base} />)
    expect(screen.getByTestId('work-type-icon--story')).toBeInTheDocument()
  })

  it('renders the work type name', () => {
    render(<TypeRow {...base} />)
    expect(screen.getByText('Story')).toBeInTheDocument()
  })

  it('renders WorkItemTypeIcon for QA Bug type', () => {
    render(<TypeRow {...base} name="QA Bug" icon="qa-bug" />)
    expect(screen.getByTestId('work-type-icon--qa-bug')).toBeInTheDocument()
  })
})
