export function getWeights(cfg) {
  return {
    WARD: { DAY: cfg.w_ward_day, NIGHT: cfg.w_ward_night },
    ICU:  { DAY: cfg.w_icu_day,  NIGHT: cfg.w_icu_night  },
  }
}

export function calcProd(entry, wardType, cfg) {
  if (!entry) return null
  const w = getWeights(cfg)
  const wt = w[wardType] || w.WARD
  const shift = (entry.shift || 'DAY').toUpperCase()
  const weights = wt[shift] || wt.DAY
  const req =
    (entry.lv1 || 0) * weights.lv1 +
    (entry.lv2 || 0) * weights.lv2 +
    (entry.lv3 || 0) * weights.lv3 +
    (entry.lv4 || 0) * weights.lv4 +
    (entry.lv5 || 0) * weights.lv5 +
    (entry.adm || 0) * (weights.adm || 0) +
    (entry.trf || 0) * (weights.trf || 0) +
    (entry.ods || 0) * (weights.ods || 0)
  const reqPlus = req * 1.15
  const act = ((entry.rn || 0) + (entry.pn || 0) * cfg.pn_coef + (entry.na || 0) * cfg.na_coef) * cfg.hours
  if (act === 0) return null
  return +(reqPlus / act * 100).toFixed(1)
}

export function prodStatus(p, cfg) {
  if (p === null || p === undefined) return { label: '—', color: '#94a3b8' }
  if (p > cfg.thr_overload) return { label: 'Overload',    color: '#dc2626' }
  if (p > cfg.thr_under)    return { label: 'Under staff', color: '#d97706' }
  if (p >= cfg.thr_opt_lo)  return { label: 'Optimal',     color: '#16a34a' }
  return { label: 'Over staff', color: '#2563eb' }
}

export function getAvailBeds(ward, oosData) {
  const oos = oosData?.[ward.id]?.count || 0
  return Math.max(0, ward.beds - oos)
}

export function calcPts(entry) {
  if (!entry) return 0
  return (entry.lv1||0)+(entry.lv2||0)+(entry.lv3||0)+(entry.lv4||0)+(entry.lv5||0)
}
