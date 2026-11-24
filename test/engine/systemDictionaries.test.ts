import { describe, expect, it } from 'vitest'
import { systemDictionaries } from '@/engine/systemDictionaries'

describe('systemDictionaries group', () => {
  it('labels the system sidebar group in both languages', () => {
    expect(systemDictionaries.it['group.system']).toBe('Sistema')
    expect(systemDictionaries.en['group.system']).toBe('System')
  })
})

describe('systemDictionaries', () => {
  it('holds the same keys in English and in Italian', () => {
    expect(Object.keys(systemDictionaries.it).sort()).toEqual(Object.keys(systemDictionaries.en).sort())
  })

  it('labels the built-in resources, their fields, enum values and actions in Italian', () => {
    const it_ = systemDictionaries.it
    expect(it_['res.user.plural']).toBe('Utenti')
    expect(it_['field.token.roles']).toBe('Ruoli')
    expect(it_['field.accessLog.subjectId']).toBe('ID soggetto')
    expect(it_['field.systemAccessLog.subjectId']).toBe('ID soggetto')
    expect(it_['enum.outcome.failure']).toBe('Non riuscito')
    expect(it_['action.token.reissue']).toBe('Riemetti')
  })
})
