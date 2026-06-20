'use client'
import { useState, useEffect } from 'react'
import { DEFAULT_CFG } from '../constants'
import { loadCfg, saveCfg, saveWardBeds, apiLoadConfig } from '../storage'

export function useConfig() {
  const [cfg, setCfgState] = useState(() => loadCfg(DEFAULT_CFG))

  useEffect(() => {
    // Fetch cfg from D1
    apiLoadConfig('cfg').then(data => {
      if (data) {
        localStorage.setItem('ipd_cfg', JSON.stringify(data))
        const merged = {
          ...DEFAULT_CFG, ...data,
          w_ward_day:   { ...DEFAULT_CFG.w_ward_day,   ...data.w_ward_day   },
          w_ward_night: { ...DEFAULT_CFG.w_ward_night, ...data.w_ward_night },
          w_icu_day:    { ...DEFAULT_CFG.w_icu_day,    ...data.w_icu_day    },
          w_icu_night:  { ...DEFAULT_CFG.w_icu_night,  ...data.w_icu_night  },
        }
        setCfgState(merged)
      }
    })
    // Also prefetch ward_beds into localStorage so SettingsTab finds it
    apiLoadConfig('ward_beds').then(data => {
      if (data) saveWardBeds(data)
    })
  }, [])

  function saveCfgAndUpdate(newCfg) {
    saveCfg(newCfg)  // saves to localStorage + pushes to D1
    setCfgState(newCfg)
  }

  return [cfg, saveCfgAndUpdate]
}
