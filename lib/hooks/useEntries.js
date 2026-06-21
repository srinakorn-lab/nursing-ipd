'use client'
import { useState, useEffect, useCallback } from 'react'
import { loadEntries, saveEntries as _save, cacheEntries, apiLoadEntries } from '../storage'

export function useEntries(year, month) {
  const [entries, setEntries] = useState(() => loadEntries(year, month))
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const local = loadEntries(year, month)
    const apiData = await apiLoadEntries(year, month)
    if (apiData !== null) {
      // D1 available — merge: local wins for keys not in D1 yet
      const merged = { ...local, ...apiData }
      cacheEntries(year, month, merged)
      setEntries(merged)
    } else {
      setEntries(local)
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { reload() }, [reload])

  async function saveEntries(data) {
    setEntries(data)  // optimistic UI update — trust local until next mount
    await _save(year, month, data)  // POST to D1 (eventual consistency)
  }

  return [entries, saveEntries, reload, loading]
}
