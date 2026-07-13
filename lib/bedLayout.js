// Room/bed code generation per ward
// Ward rooms: 25 rooms each — building A: '501A'..'525A', building B: '6B01'..'6B25'
// ICU-type: plain bed numbers '1'..'N'
//
// bed_layout config (per ward, all optional):
// {
//   rooms: ['01'], bedsPerRoom: 6,                          // v1: bulk shared rooms (Settings)
//   splitRooms: { '17': { beds: 3, label: 'หญิงรวม monitor' } },  // v2: per-room split (Bed map page)
//   extraBeds:  [ { code: '14', label: 'rehab' } ],         // แทรกเตียงเพิ่ม (ICU 14, CCU10, ...)
//   roomTypes:  { '17': 'female_monitor' },                 // v3: category per room → free-bed summary
// }

export const ROOMS_PER_WARD = 25

// Room categories → free-bed summary buckets
// isSingle: private (1-patient) room subtypes; else shared (รวม) rooms
export const ROOM_CATEGORIES = [
  { key: 'single',         label: 'ห้องเดี่ยว',        field: 'single_free',    color: '#0284c7', isSingle: true },
  { key: 'child',          label: 'ห้องเดี่ยวเด็ก',    field: 'child_free',     color: '#0d9488', isSingle: true },
  { key: 'adult',          label: 'ห้องเดี่ยวผู้ใหญ่', field: 'adult_free',     color: '#ca8a04', isSingle: true },
  { key: 'suite',          label: 'ห้อง Suite',        field: 'suite_free',     color: '#e11d48', isSingle: true },
  { key: 'male',           label: 'รวมชาย',            field: 'male_free',      color: '#2563eb' },
  { key: 'female',         label: 'รวมหญิง',           field: 'female_free',    color: '#db2777' },
  { key: 'male_monitor',   label: 'Monitor รวมชาย',    field: 'monitor_male',   color: '#7c3aed' },
  { key: 'female_monitor', label: 'Monitor รวมหญิง',   field: 'monitor_female', color: '#c026d3' },
]

export const CATEGORY_BY_KEY = Object.fromEntries(ROOM_CATEGORIES.map(c => [c.key, c]))

export const WARD_ROOM_META = {
  W5A:  { floor: '5',  bldg: 'A' },
  W6A:  { floor: '6',  bldg: 'A' },
  W6B:  { floor: '6',  bldg: 'B' },
  W7A:  { floor: '7',  bldg: 'A' },
  W8A:  { floor: '8',  bldg: 'A' },
  W9A:  { floor: '9',  bldg: 'A' },
  W10A: { floor: '10', bldg: 'A' },
  W11A: { floor: '11', bldg: 'A' },
  W12A: { floor: '12', bldg: 'A' },
}

export function roomCode(wardId, roomNum2) {
  const meta = WARD_ROOM_META[wardId]
  if (!meta) return roomNum2
  return meta.bldg === 'B'
    ? `${meta.floor}B${roomNum2}`        // 6B01
    : `${meta.floor}${roomNum2}A`        // 501A, 1101A
}

/**
 * Build the full bed-unit list for a ward.
 * @returns [{ code, room, roomNum, isShared, isExtra, label }]
 */
export function getBedUnits(ward, layoutCfg) {
  if (!ward) return []
  const wardLayout = layoutCfg?.[ward.id] || {}
  const roomTypes = wardLayout.roomTypes || {}

  // Merge v1 (rooms + bedsPerRoom) into v2 splitRooms shape
  const splitRooms = { ...(wardLayout.splitRooms || {}) }
  ;(wardLayout.rooms || []).forEach(r => {
    if (!splitRooms[r]) splitRooms[r] = { beds: +wardLayout.bedsPerRoom || 6 }
  })

  const roomCount = +wardLayout.roomCount || ROOMS_PER_WARD
  // bed suffix within a shared room: 'letter' → A,B,C… ; default → /1,/2,/3
  const useLetter = wardLayout.bedSuffix === 'letter'
  const bedTag = (b) => useLetter ? String.fromCharCode(64 + b) : `/${b}`
  const units = []
  if (!WARD_ROOM_META[ward.id]) {
    // ICU-type: numbered beds
    for (let i = 1; i <= ward.beds; i++) {
      const rn = String(i)
      units.push({ code: rn, room: rn, roomNum: rn, isShared: false, isExtra: false, category: roomTypes[rn] || null })
    }
  } else {
    for (let r = 1; r <= roomCount; r++) {
      const num2 = String(r).padStart(2, '0')
      const code = roomCode(ward.id, num2)
      const split = splitRooms[num2]
      const category = roomTypes[num2] || null
      if (split) {
        const n = Math.max(2, +split.beds || 6)
        for (let b = 1; b <= n; b++) {
          units.push({ code: `${code}${bedTag(b)}`, room: code, roomNum: num2, isShared: true, isExtra: false, label: split.label || '', category })
        }
      } else {
        units.push({ code, room: code, roomNum: num2, isShared: false, isExtra: false, category })
      }
    }
  }

  // Extra beds (แทรก) — any ward type
  ;(wardLayout.extraBeds || []).forEach(eb => {
    units.push({
      code: String(eb.code), room: String(eb.code), roomNum: String(eb.code),
      isShared: false, isExtra: true, label: eb.label || '', category: roomTypes[String(eb.code)] || null,
    })
  })
  return units
}

// Category bucket for an empty bed unit (for free-bed summary)
export function bedCategoryField(unit) {
  if (unit.category && CATEGORY_BY_KEY[unit.category]) return CATEGORY_BY_KEY[unit.category].field
  // Default: single (private) rooms count as ห้องว่างเดี่ยว; shared/extra with no type → single too
  return 'single_free'
}

/**
 * Room-level view: group bed units into rooms.
 * @returns [{ roomNum, code, isShared, isExtra, category, beds: [unit], bedCount }]
 */
export function getRooms(ward, layoutCfg) {
  const units = getBedUnits(ward, layoutCfg)
  const map = new Map()
  units.forEach(u => {
    const key = u.roomNum
    if (!map.has(key)) {
      map.set(key, {
        roomNum: u.roomNum, code: u.room,
        isShared: u.isShared, isExtra: u.isExtra, category: u.category,
        beds: [],
      })
    }
    map.get(key).beds.push(u)
  })
  return [...map.values()].map(r => ({ ...r, bedCount: r.beds.length }))
}

// Room-level "sex" from category: male / female / null (mixed/unset)
export function roomSexOf(category) {
  if (category === 'male' || category === 'male_monitor') return 'M'
  if (category === 'female' || category === 'female_monitor') return 'F'
  return null
}
