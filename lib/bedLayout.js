// Room/bed code generation per ward
// Ward rooms: 25 rooms each — building A: '501A'..'525A', building B: '6B01'..'6B25'
// ICU-type: plain bed numbers '1'..'N'
// Shared rooms (ห้องรวม): configured per ward → beds shown as '6B01/1'..'6B01/6'

export const ROOMS_PER_WARD = 25

// floor + building per ward (only WARD type uses room codes)
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

// room number '01'..'25' → full room code
export function roomCode(wardId, roomNum2) {
  const meta = WARD_ROOM_META[wardId]
  if (!meta) return roomNum2
  return meta.bldg === 'B'
    ? `${meta.floor}B${roomNum2}`        // 6B01
    : `${meta.floor}${roomNum2}A`        // 501A, 1101A
}

/**
 * Build the full bed-unit list for a ward.
 * @param ward       ward object ({ id, type, beds })
 * @param layoutCfg  bed_layout config: { [wardId]: { rooms: ['01','13'], bedsPerRoom: 6 } }
 * @returns [{ code, room, isShared }]
 */
export function getBedUnits(ward, layoutCfg) {
  if (!ward) return []
  // ICU-type: plain numbered beds
  if (!WARD_ROOM_META[ward.id]) {
    return Array.from({ length: ward.beds }, (_, i) => ({
      code: String(i + 1), room: String(i + 1), isShared: false,
    }))
  }
  const wardLayout  = layoutCfg?.[ward.id] || {}
  const sharedRooms = new Set(wardLayout.rooms || [])
  const bedsPerRoom = +wardLayout.bedsPerRoom || 6

  const units = []
  for (let r = 1; r <= ROOMS_PER_WARD; r++) {
    const num2 = String(r).padStart(2, '0')
    const code = roomCode(ward.id, num2)
    if (sharedRooms.has(num2)) {
      for (let b = 1; b <= bedsPerRoom; b++) {
        units.push({ code: `${code}/${b}`, room: code, isShared: true })
      }
    } else {
      units.push({ code, room: code, isShared: false })
    }
  }
  return units
}
