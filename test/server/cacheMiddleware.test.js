import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { existsSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'fs'
import {
  normalizeCacheKey,
  getCachePath,
  initializeCacheDirectory,
  loadCacheFile,
  saveCacheFile,
  isCacheValid,
  getCacheEnabled,
  withCache
} from '../../server/cacheMiddleware.js'

describe('cacheMiddleware', () => {
  describe('normalizeCacheKey', () => {
    it('converts basic name to lowercase with dashes', () => {
      expect(normalizeCacheKey('Miles Davis')).toBe('miles-davis')
    })

    it('handles multiple spaces between words', () => {
      expect(normalizeCacheKey('Miles  Davis')).toBe('miles-davis')
    })

    it('handles punctuation', () => {
      expect(normalizeCacheKey('Thelonious Monk, Jr.')).toBe('thelonious-monk-jr')
    })

    it('handles unicode characters with diacritics', () => {
      expect(normalizeCacheKey('Björk')).toBe('bjork')
    })

    it('handles hyphenated names', () => {
      expect(normalizeCacheKey('Miles-Davis')).toBe('miles-davis')
    })

    it('handles leading and trailing whitespace', () => {
      expect(normalizeCacheKey('  John Coltrane  ')).toBe('john-coltrane')
    })

    it('handles special characters like apostrophes', () => {
      expect(normalizeCacheKey("D'Angelo")).toBe('d-angelo')
    })

    it('collapses multiple consecutive dashes', () => {
      expect(normalizeCacheKey('Miles---Davis')).toBe('miles-davis')
    })
  })

  describe('getCachePath', () => {
    it('returns correct path using normalized key', () => {
      const path = getCachePath('Miles Davis')
      expect(path).toContain('server/cache/influence-graphs')
      expect(path).toContain('miles-davis.json')
      expect(path).toBe(join(process.cwd(), 'server/cache/influence-graphs/miles-davis.json'))
    })
  })

  describe('initializeCacheDirectory', () => {
    const testCacheDir = join(process.cwd(), 'server/cache/influence-graphs')

    afterEach(() => {
      if (existsSync(testCacheDir)) {
        rmSync(testCacheDir, { recursive: true, force: true })
      }
    })

    it('creates cache directory if it does not exist', async () => {
      if (existsSync(testCacheDir)) {
        rmSync(testCacheDir, { recursive: true, force: true })
      }

      await initializeCacheDirectory()

      expect(existsSync(testCacheDir)).toBe(true)
    })

    it('succeeds if directory already exists', async () => {
      await initializeCacheDirectory()
      await expect(initializeCacheDirectory()).resolves.not.toThrow()
    })
  })

  describe('loadCacheFile', () => {
    const testCacheDir = join(process.cwd(), 'server/cache/influence-graphs')

    beforeEach(async () => {
      await initializeCacheDirectory()
    })

    afterEach(() => {
      if (existsSync(testCacheDir)) {
        rmSync(testCacheDir, { recursive: true, force: true })
      }
    })

    it('returns cached data when file exists and is valid', async () => {
      const cacheData = {
        recordedAt: new Date().toISOString(),
        data: { nodes: [], links: [] }
      }
      const cachePath = getCachePath('Miles Davis')
      writeFileSync(cachePath, JSON.stringify(cacheData))

      const result = await loadCacheFile('Miles Davis')

      expect(result).toEqual(cacheData)
    })

    it('returns null when file does not exist', async () => {
      const result = await loadCacheFile('Nonexistent Person')
      expect(result).toBeNull()
    })

    it('returns null and logs warning when JSON is corrupted', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const cachePath = getCachePath('Miles Davis')
      writeFileSync(cachePath, 'invalid json{')

      const result = await loadCacheFile('Miles Davis')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('returns null when file has invalid structure', async () => {
      const cachePath = getCachePath('Miles Davis')
      writeFileSync(cachePath, JSON.stringify({ wrong: 'structure' }))

      const result = await loadCacheFile('Miles Davis')

      expect(result).toEqual({ wrong: 'structure' })
    })
  })

  describe('saveCacheFile', () => {
    const testCacheDir = join(process.cwd(), 'server/cache/influence-graphs')

    beforeEach(async () => {
      await initializeCacheDirectory()
    })

    afterEach(() => {
      if (existsSync(testCacheDir)) {
        rmSync(testCacheDir, { recursive: true, force: true })
      }
    })

    it('saves cache file with timestamp and data', async () => {
      const graphData = { nodes: [], links: [] }

      await saveCacheFile('Miles Davis', graphData)

      const cachePath = getCachePath('Miles Davis')
      expect(existsSync(cachePath)).toBe(true)

      const savedData = JSON.parse(readFileSync(cachePath, 'utf-8'))
      expect(savedData).toHaveProperty('recordedAt')
      expect(savedData).toHaveProperty('data')
      expect(savedData.data).toEqual(graphData)
      expect(new Date(savedData.recordedAt)).toBeInstanceOf(Date)
    })

    it('uses atomic write pattern', async () => {
      const graphData = { nodes: [], links: [] }
      await saveCacheFile('Miles Davis', graphData)

      const tempFiles = existsSync(testCacheDir)
        ? readdirSync(testCacheDir).filter(f => f.includes('.tmp.'))
        : []

      expect(tempFiles.length).toBe(0)
    })
  })

  describe('isCacheValid', () => {
    it('returns true for fresh cache (1 day old)', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      expect(isCacheValid(oneDayAgo)).toBe(true)
    })

    it('returns false for expired cache (91 days)', () => {
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString()
      expect(isCacheValid(ninetyOneDaysAgo)).toBe(false)
    })

    it('returns false for cache exactly at TTL (90 days)', () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      expect(isCacheValid(ninetyDaysAgo)).toBe(false)
    })

    it('returns true for future timestamp (clock skew)', () => {
      const future = new Date(Date.now() + 60 * 1000).toISOString()
      expect(isCacheValid(future)).toBe(true)
    })

    it('respects CACHE_TTL_DAYS env var', () => {
      const original = process.env.CACHE_TTL_DAYS
      process.env.CACHE_TTL_DAYS = '30'

      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
      expect(isCacheValid(thirtyOneDaysAgo)).toBe(false)

      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
      expect(isCacheValid(twentyNineDaysAgo)).toBe(true)

      if (original) {
        process.env.CACHE_TTL_DAYS = original
      } else {
        delete process.env.CACHE_TTL_DAYS
      }
    })

    it('uses default 90 days for invalid env var', () => {
      const original = process.env.CACHE_TTL_DAYS
      process.env.CACHE_TTL_DAYS = 'invalid'

      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString()
      expect(isCacheValid(ninetyOneDaysAgo)).toBe(false)

      if (original) {
        process.env.CACHE_TTL_DAYS = original
      } else {
        delete process.env.CACHE_TTL_DAYS
      }
    })
  })

  describe('getCacheEnabled', () => {
    it('returns true by default when no env var set', () => {
      const original = process.env.ENABLE_CACHE
      delete process.env.ENABLE_CACHE

      expect(getCacheEnabled()).toBe(true)

      if (original) {
        process.env.ENABLE_CACHE = original
      }
    })

    it('returns true when ENABLE_CACHE=true', () => {
      const original = process.env.ENABLE_CACHE
      process.env.ENABLE_CACHE = 'true'

      expect(getCacheEnabled()).toBe(true)

      if (original) {
        process.env.ENABLE_CACHE = original
      } else {
        delete process.env.ENABLE_CACHE
      }
    })

    it('returns false when ENABLE_CACHE=false', () => {
      const original = process.env.ENABLE_CACHE
      process.env.ENABLE_CACHE = 'false'

      expect(getCacheEnabled()).toBe(false)

      if (original) {
        process.env.ENABLE_CACHE = original
      } else {
        delete process.env.ENABLE_CACHE
      }
    })
  })

  describe('withCache', () => {
    const testCacheDir = join(process.cwd(), 'server/cache/influence-graphs')

    beforeEach(async () => {
      await initializeCacheDirectory()
    })

    afterEach(() => {
      if (existsSync(testCacheDir)) {
        rmSync(testCacheDir, { recursive: true, force: true })
      }
    })

    it('calls generator and saves to cache on cache miss', async () => {
      const generatorFn = vi.fn().mockResolvedValue({ nodes: [], links: [] })

      const result = await withCache('Miles Davis', generatorFn)

      expect(generatorFn).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ nodes: [], links: [] })

      const cachePath = getCachePath('Miles Davis')
      expect(existsSync(cachePath)).toBe(true)
    })

    it('returns cached data without calling generator on cache hit', async () => {
      const graphData = { nodes: [], links: [] }
      await saveCacheFile('Miles Davis', graphData)

      const generatorFn = vi.fn()

      const result = await withCache('Miles Davis', generatorFn)

      expect(generatorFn).not.toHaveBeenCalled()
      expect(result).toEqual(graphData)
    })

    it('regenerates when cache is expired', async () => {
      const oldData = { nodes: [{ id: 'old' }], links: [] }
      const expiredDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString()
      const cachePath = getCachePath('Miles Davis')
      writeFileSync(cachePath, JSON.stringify({ recordedAt: expiredDate, data: oldData }))

      const newData = { nodes: [{ id: 'new' }], links: [] }
      const generatorFn = vi.fn().mockResolvedValue(newData)

      const result = await withCache('Miles Davis', generatorFn)

      expect(generatorFn).toHaveBeenCalledTimes(1)
      expect(result).toEqual(newData)
    })

    it('bypasses cache when ENABLE_CACHE=false', async () => {
      const original = process.env.ENABLE_CACHE
      process.env.ENABLE_CACHE = 'false'

      const graphData = { nodes: [], links: [] }
      await saveCacheFile('Miles Davis', graphData)

      const generatorFn = vi.fn().mockResolvedValue({ nodes: [{ id: 'new' }], links: [] })

      const result = await withCache('Miles Davis', generatorFn)

      expect(generatorFn).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ nodes: [{ id: 'new' }], links: [] })

      if (original) {
        process.env.ENABLE_CACHE = original
      } else {
        delete process.env.ENABLE_CACHE
      }
    })

    it('handles cache read errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const cachePath = getCachePath('Miles Davis')
      writeFileSync(cachePath, 'corrupted')

      const graphData = { nodes: [], links: [] }
      const generatorFn = vi.fn().mockResolvedValue(graphData)

      const result = await withCache('Miles Davis', generatorFn)

      expect(generatorFn).toHaveBeenCalledTimes(1)
      expect(result).toEqual(graphData)
      consoleSpy.mockRestore()
    })

    it('propagates generator errors', async () => {
      const generatorFn = vi.fn().mockRejectedValue(new Error('Generator failed'))

      await expect(withCache('Miles Davis', generatorFn)).rejects.toThrow('Generator failed')
    })
  })
})
