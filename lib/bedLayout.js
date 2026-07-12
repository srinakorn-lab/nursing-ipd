// Room/bed code generation per ward
// Ward rooms: 25 rooms each — building A: '501A'..'525A', building B: '6B01'..'6B25'
// ICU-type: plain bed numbers '1'..'N'
//
// bed_layout config (per ward, all optional):
// {
//   rooms: ['01'], bedsPerRoom: 6,                          // v1: bulk shared rooms (Settings)
//   splitRooms: { '17': { beds: 3, label: 'หญิงรวม monitor' } },  // v2: per-room split (Bed map page)
//   extraBeds:  [ { code: '14', label: 'rehab' } ],         // แทรกเตียงเพิ่ม (ICU 14, CCU10, ...)
// }

export const ROOMS_PER_WARD = 25

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

  // Merge v1 (rooms + bedsPerRoom) into v2 splitRooms shape
  const splitRooms = { ...(wardLayout.splitRooms || {}) }
  ;(wardLayout.rooms || []).forEach(r => {
    if (!splitRooms[r]) splitRooms[r] = { beds: +wardLayout.bedsPerRoom || 6 }
  })

  const units = []
  if (!WARD_ROOM_META[ward.id]) {
    // ICU-type: numbered beds
    for (let i = 1; i <= ward.beds; i++) {
      units.push({ code: String(i), room: String(i), roomNum: String(i), isShared: false, isExtra: false })
    }
  } else {
    for (let r = 1; r <= ROOMS_PER_WARD; r++) {
      const num2 = String(r).padStart(2, '0')
      const code = roomCode(ward.id, num2)
      const split = splitRooms[num2]
      if (split) {
        const n = Math.max(2, +split.beds || 6)
        for (let b = 1; b <= n; b++) {
          units.push({ code: `${code}/${b}`, room: code, roomNum: num2, isShared: true, isExtra: false, label: split.label || '' })
        }
      } else {
        units.push({ code, room: code, roomNum: num2, isShared: false, isExtra: false })
      }
    }
  }

  // Extra beds (แทรก) — any ward type
  ;(wardLayout.extraBeds || []).forEach(eb => {
    units.push({
      code: String(eb.code), room: String(eb.code), roomNum: String(eb.code),
      isShared: false, isExtra: true, label: eb.label || '',
    })
  })
  return units
}
