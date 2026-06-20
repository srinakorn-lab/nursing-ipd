'use client'
import { useState, useEffect } from 'react'
import { loadOOS, saveOOS as _save, apiLoadOOS } from '../storage'

export function useOos() {
  const [oos, setOos] = useState(() => loadOOS())

  useEffect(() => {
    apiLoadOOS().then(data => {
      if (data) {
        localStorage.setItem('ipd_oos', JSON.stringify(data))
        setOos(data)
      }
    })
  }, [])

  function saveOos(data) {
    _save(data)  // saves to localStorage + pushes to D1
    setOos(data)
  }

  return [oos, saveOos]
}
