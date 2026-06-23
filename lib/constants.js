export const WARDS = [
  { id: 'W5A',  name: 'W.5A',  type: 'WARD', beds: 15 },
  { id: 'W6A',  name: 'W.6A',  type: 'WARD', beds: 26 },
  { id: 'W6B',  name: 'W.6B',  type: 'WARD', beds: 36 },
  { id: 'W7A',  name: 'W.7A',  type: 'WARD', beds: 21 },
  { id: 'W8A',  name: 'W.8A',  type: 'WARD', beds: 27 },
  { id: 'W9A',  name: 'W.9A',  type: 'WARD', beds: 23 },
  { id: 'W10A', name: 'W.10A', type: 'WARD', beds: 25 },
  { id: 'W11A', name: 'W.11A', type: 'WARD', beds: 12 },
  { id: 'W12A', name: 'W.12A', type: 'WARD', beds: 24 },
  { id: 'ICU',  name: 'ICU',   type: 'ICU',  beds: 13 },
  { id: 'CCU',  name: 'CCU',   type: 'ICU',  beds: 8  },
  { id: 'NCU',  name: 'NCU',   type: 'ICU',  beds: 7  },
  { id: 'SEMI', name: 'SEMI',  type: 'ICU',  beds: 8  },
]

export const DEFAULT_CFG = {
  hours: 11, pn_coef: 0.85, na_coef: 0.50,
  ward_ratio: 8, icu_ratio: 2,
  thr_over: 95, thr_opt_lo: 95, thr_opt_hi: 110, thr_under: 110, thr_overload: 130,
  w_ward_day:   { lv1: 0.334, lv2: 2.317, lv3: 3.640, lv4: 4.962,  lv5: 7.935,  adm: 4.962, trf: 4.962, ods: 4.962 },
  w_ward_night: { lv1: 0.253, lv2: 1.719, lv3: 2.697, lv4: 3.674,  lv5: 6.555,  adm: 3.674, trf: 3.674, ods: 0     },
  w_icu_day:    { lv1: 0.334, lv2: 2.317, lv3: 3.640, lv4: 10.350, lv5: 16.560, adm: 10.350 },
  w_icu_night:  { lv1: 0.253, lv2: 1.719, lv3: 2.697, lv4: 10.350, lv5: 16.560, adm: 10.350 },
}

export const SETTINGS_PWD = 'Pts@1234'

export const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
