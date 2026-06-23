'use client'
import { useState, useEffect, useMemo } from 'react'
import { WARDS } from '../constants'
import { loadWardBeds, apiLoadConfig, saveWardBeds } from '../storage'

// Returns WARDS array with bed counts overridden by ward_beds config (D1/localStorage)
export function useWards() {
  const [override, setOverride] = useState(() => loadWardBeds())

  useEffect(() => {
    apiLoadConfig('ward_beds').then(d => {
      if (d && typeof d === 'object') {
        saveWardBeds(d)  // refresh localStorage cache
        setOverride(d)
      }
    })
  }, [])

  return useMemo(
    () => WARDS.map(w => ({ ...w, beds: +override?.[w.id] || w.beds })),
    [override]
  )
}
