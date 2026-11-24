import { describe, expect, it } from 'vitest'
import { activeNavPath } from '@/ui/layout/activeNav'

const paths = ['users', 'rag/admin/grants', 'rag/admin/grants/history', 'rag/admin/triage']

describe('activeNavPath', () => {
  it('lights only the nested entry on a nested resource page', () => {
    expect(activeNavPath('/rag/admin/grants/history', paths)).toBe('rag/admin/grants/history')
    expect(activeNavPath('/rag/admin/grants/history/show/7', paths)).toBe('rag/admin/grants/history')
  })

  it('picks the longest match whatever the menu order', () => {
    const reversed = [...paths].reverse()
    expect(activeNavPath('/rag/admin/grants/history', reversed)).toBe('rag/admin/grants/history')
    expect(activeNavPath('/rag/admin/grants', reversed)).toBe('rag/admin/grants')
  })

  it('keeps the parent entry on its own pages', () => {
    expect(activeNavPath('/rag/admin/grants', paths)).toBe('rag/admin/grants')
    expect(activeNavPath('/rag/admin/grants/edit/7', paths)).toBe('rag/admin/grants')
  })

  it('needs a whole segment, not a shared prefix', () => {
    expect(activeNavPath('/users-archive', paths)).toBeUndefined()
    expect(activeNavPath('/account', paths)).toBeUndefined()
  })
})
