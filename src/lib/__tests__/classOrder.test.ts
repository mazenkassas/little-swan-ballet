import { describe, it, expect } from 'vitest'
import { compareClassNames } from '../classOrder'

describe('compareClassNames', () => {
  it('orders PreBallet then Grades 1–9, Term 1 before Term 2', () => {
    const expected = ['PreBallet 1 Term 1', 'PreBallet 1 Term 2', 'PreBallet 2 Term 1', 'PreBallet 2 Term 2']
    for (let g = 1; g <= 9; g++) expected.push(`Grade ${g} Term 1`, `Grade ${g} Term 2`)
    const shuffled = [...expected].reverse()
    expect(shuffled.sort(compareClassNames)).toEqual(expected)
  })

  it('handles spacing/hyphen variants and numeric grades', () => {
    const names = ['Grade 10 Term 1', 'Grade 2 Term 2', 'Pre-Ballet 2 Term 1', 'Other group', 'Grade 2 Term 1']
    expect(names.sort(compareClassNames)).toEqual([
      'Pre-Ballet 2 Term 1', 'Grade 2 Term 1', 'Grade 2 Term 2', 'Grade 10 Term 1', 'Other group',
    ])
  })
})
