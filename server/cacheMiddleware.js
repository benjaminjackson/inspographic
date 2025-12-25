import { join } from 'path'
import { mkdir, readFile, writeFile, rename, unlink } from 'fs/promises'

const CACHE_DIR = join(process.cwd(), 'server/cache/influence-graphs')

export function normalizeCacheKey(personName) {
  return personName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export function getCachePath(personName) {
  const normalizedKey = normalizeCacheKey(personName)
  return join(CACHE_DIR, `${normalizedKey}.json`)
}

export async function initializeCacheDirectory() {
  await mkdir(CACHE_DIR, { recursive: true })
}

export async function loadCacheFile(personName) {
  try {
    const cachePath = getCachePath(personName)
    const fileContents = await readFile(cachePath, 'utf-8')
    const cacheData = JSON.parse(fileContents)
    return cacheData
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }
    console.warn(`Cache read error for ${personName}:`, error.message)
    return null
  }
}

export async function saveCacheFile(personName, graphData) {
  try {
    const cachePath = getCachePath(personName)
    const tempPath = `${cachePath}.tmp.${Date.now()}`

    const cacheData = {
      recordedAt: new Date().toISOString(),
      data: graphData
    }

    try {
      await writeFile(tempPath, JSON.stringify(cacheData, null, 2))
      await rename(tempPath, cachePath)
    } catch (error) {
      await unlink(tempPath).catch(() => {})
      throw error
    }
  } catch (error) {
    console.warn(`Cache write error for ${personName}:`, error.message)
  }
}

export function isCacheValid(recordedAt) {
  try {
    const ttlDays = parseInt(process.env.CACHE_TTL_DAYS, 10)
    const validTTL = !isNaN(ttlDays) && ttlDays > 0 ? ttlDays : 90

    if (validTTL > 365) {
      console.warn(`CACHE_TTL_DAYS is set to ${validTTL}, which seems unreasonably high`)
    }

    const recordedDate = new Date(recordedAt)
    const expirationDate = new Date(recordedDate.getTime() + validTTL * 24 * 60 * 60 * 1000)

    return Date.now() < expirationDate.getTime()
  } catch (error) {
    return false
  }
}

export function getCacheEnabled() {
  const value = process.env.ENABLE_CACHE

  if (value === undefined || value === null) {
    return true
  }

  if (value === 'false' || value === '0') {
    return false
  }

  return true
}

export async function withCache(personName, generatorFn) {
  if (!getCacheEnabled()) {
    return generatorFn()
  }

  try {
    const cached = await loadCacheFile(personName)
    if (cached && isCacheValid(cached.recordedAt)) {
      console.debug(`Cache hit: ${personName}`)
      return cached.data
    }
  } catch (error) {
    console.warn(`Cache read error for ${personName}:`, error.message)
  }

  console.debug(`Cache miss: ${personName}`)
  const result = await generatorFn()

  try {
    await saveCacheFile(personName, result)
  } catch (error) {
    console.warn(`Cache write error for ${personName}:`, error.message)
  }

  return result
}
