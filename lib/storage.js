// All localStorage keys match the existing HTML app exactly

export const storageKey = (year, month) => `ipd_entries_${year}_${month}`
export const dailyStorageKey = (year, month, wardId) => `ipd_daily_${year}_${month}_${wardId}`

// ── Local storage helpers (synchronous) ─────────────────────────

export function loadEntries(year, month) {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(storageKey(year, month))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const result = {}
      parsed.forEach(e => {
        if (!result[e.wardId]) result[e.wardId] = {}
        result[e.wardId][e.shift?.toLowerCase() || 'day'] = e
      })
      return result
    }
    return parsed
  } catch { return {} }
}

export function cacheEntries(year, month, data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(year, month), JSON.stringify(data))
}

export function saveEntries(year, month, data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(year, month), JSON.stringify(data))
  // Sync to D1 in background
  Object.entries(data).forEach(([wardId, shifts]) => {
    Object.entries(shifts).forEach(([shift, entry]) => {
      if (!entry) return
      fetch(`/api/entries/${year}/${month}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, wardId, shift }),
      }).catch(() => {})
    })
  })
}

export function loadDailyEntries(year, month, wardId) {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(dailyStorageKey(year, month, wardId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const result = {}
      parsed.forEach(e => {
        const d = new Date(e.date).getDate()
        if (!result[d]) result[d] = {}
        result[d][e.shift?.toLowerCase() || 'day'] = e
      })
      return result
    }
    return parsed
  } catch { return {} }
}

export function saveDailyEntry(year, month, wardId, day, shift, entry) {
  const all = loadDailyEntries(year, month, wardId)
  if (!all[day]) all[day] = {}
  all[day][shift.toLowerCase()] = entry
  if (typeof window !== 'undefined') {
    localStorage.setItem(dailyStorageKey(year, month, wardId), JSON.stringify(all))
    fetch(`/api/daily/${year}/${month}/${wardId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, shift: shift.toLowerCase(), ...entry }),
    }).catch(() => {})
  }
}

export function loadCfg(DEFAULT_CFG) {
  if (typeof window === 'undefined') return { ...DEFAULT_CFG }
  try {
    const raw = localStorage.getItem('ipd_cfg')
    if (!raw) return { ...DEFAULT_CFG }
    const saved = JSON.parse(raw)
    return {
      ...DEFAULT_CFG, ...saved,
      w_ward_day:   { ...DEFAULT_CFG.w_ward_day,   ...saved.w_ward_day   },
      w_ward_night: { ...DEFAULT_CFG.w_ward_night, ...saved.w_ward_night },
      w_icu_day:    { ...DEFAULT_CFG.w_icu_day,    ...saved.w_icu_day    },
      w_icu_night:  { ...DEFAULT_CFG.w_icu_night,  ...saved.w_icu_night  },
    }
  } catch { return { ...DEFAULT_CFG } }
}

export function saveCfg(cfg) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ipd_cfg', JSON.stringify(cfg))
    fetch('/api/config/cfg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    }).catch(() => {})
  }
}

export function loadOOS() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('ipd_oos') || '{}') } catch { return {} }
}

export function saveOOS(data) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ipd_oos', JSON.stringify(data))
    fetch('/api/oos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
  }
}

export function loadWardBeds() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('ipd_ward_beds') || '{}') } catch { return {} }
}

export function saveWardBeds(data) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ipd_ward_beds', JSON.stringify(data))
    fetch('/api/config/ward_beds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
  }
}

// ── Async API fetch helpers (read from D1) ───────────────────────

export async function apiLoadEntries(year, month) {
  try {
    const res = await fetch(`/api/entries/${year}/${month}`)
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function apiLoadDailyEntries(year, month, wardId) {
  try {
    const res = await fetch(`/api/daily/${year}/${month}/${wardId}`)
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function apiLoadOOS() {
  try {
    const res = await fetch('/api/oos')
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function apiLoadConfig(key) {
  try {
    const res = await fetch(`/api/config/${key}`)
    return res.ok ? res.json() : null
  } catch { return null }
}
