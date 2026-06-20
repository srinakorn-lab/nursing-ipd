'use client'
import { useState, useEffect, useCallback } from 'react'
import { loadEntries, saveEntries as _save, apiLoadEntries } from '../storage'

export function useEntries(year, month) {
  const [entries, setEntries] = useState(() => loadEntries(year, month))
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const apiData = await apiLoadEntries(year, month)
    if (apiData && Object.keys(apiData).length > 0) {
      _save(year, month, apiData)  // update localStorage cache (without re-triggering API)
      setEntries(apiData)
    } else {
      setEntries(loadEntries(year, month))
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { reload() }, [reload])

  function saveEntries(data) {
    _save(year, month, data)  // saves to localStorage + pushes to D1
    setEntries(data)
  }

  return [entries, saveEntries, reload, loading]
}
