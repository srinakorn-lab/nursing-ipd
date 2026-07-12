'use client'
import { useState, useEffect, useMemo } from 'react'
import { useWards } from '../../lib/hooks/useWards'
import { apiLoadBedsMap, apiSaveBed, apiMoveBed, apiClearBedsMapWard, apiLoadConfig } from '../../lib/storage'
import { getBedUnits, WARD_ROOM_META } from '../../lib/bedLayout'
import Modal from '../ui/Modal'

const STATUS = {
  empty:    { label: 'ว่าง',          color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '⬜' },
  occupied: { label: 'มีคนไข้',        color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '🛌' },
  cleaning: { label: 'รอเตรียมห้อง',   color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '🧹' },
}

const LV_COLOR = ['#93c5fd','#6ee7b7','#fcd34d','#fb923c','#f87171']

function dayDiff(iso) {
  if (!iso) return 0
  return Math.max(0, Math.floor((new Date() - new Date(iso)) / (1000*60*60*24)))
}

function BedCard({ unit, bed, isMoveSrc, onClick }) {
  const s = STATUS[bed.status] || STATUS.empty
  return (
    <button onClick={onClick}
      className={`text-left rounded-xl border-2 p-2 min-h-[74px] transition-all hover:shadow-md ${isMoveSrc ? 'ring-2 ring-indigo-400' : ''}`}
      style={{ background: s.bg, borderColor: unit.isExtra ? '#a855f7' : s.border, borderStyle: unit.isExtra ? 'dashed' : 'solid' }}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-600">{unit.code}</div>
        <div className="text-sm">{s.icon}</div>
      </div>
      {unit.label && (
        <div className="text-[9px] text-purple-600 font-semibold truncate">{unit.label}</div>
      )}
      {bed.status === 'occupied' && (
        <>
          <div className="text-xs font-bold truncate mt-0.5" style={{ color: s.color }}>
            {bed.name || bed.hn || '—'}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-600">
            {bed.sex && <span>{bed.sex === 'M' ? '♂' : '♀'}</span>}
            {bed.level && (
              <span className="px-1 rounded text-white font-bold"
                style={{ background: LV_COLOR[bed.level - 1] }}>Lv{bed.level}</span>
            )}
            {bed.admitted_at && <span>{dayDiff(bed.admitted_at)}d</span>}
          </div>
        </>
      )}
      {bed.status === 'cleaning' && (
        <div className="text-[10px] mt-1" style={{ color: s.color }}>รอเตรียมห้อง</div>
      )}
    </button>
  )
}

export default function BedMapTab() {
  const WARDS = useWards()
  const [data, setData] = useState({})
  const [layoutCfg, setLayoutCfg] = useState({})
  const [activeWard, setActiveWard] = useState(WARDS[0]?.id)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const [editingBed, setEditingBed] = useState(null)   // { ward, bedNo, bed, unit }
  const [moveMode, setMoveMode] = useState(null)       // { fromWard, fromBed, bed }
  const [splitModal, setSplitModal] = useState(null)   // { roomNum, code }
  const [extraModal, setExtraModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([apiLoadBedsMap(), apiLoadConfig('bed_layout')]).then(([d, layout]) => {
      setData(d || {})
      if (layout && typeof layout === 'object') setLayoutCfg(layout)
      setLoading(false)
    })
  }, [reloadKey])

  const activeWardObj = WARDS.find(w => w.id === activeWard)
  const isRoomWard = !!WARD_ROOM_META[activeWard]

  const activeUnits = useMemo(() => {
    if (!activeWardObj) return []
    const wd = data[activeWard] || {}
    return getBedUnits(activeWardObj, layoutCfg).map(u => ({
      ...u,
      bed: wd[u.code] || { ward_id: activeWard, bed_no: u.code, status: 'empty' },
    }))
  }, [activeWard, activeWardObj, data, layoutCfg])

  const singles = activeUnits.filter(u => !u.isShared && !u.isExtra)
  const extras  = activeUnits.filter(u => u.isExtra)
  const sharedRooms = useMemo(() => {
    const map = {}
    activeUnits.filter(u => u.isShared).forEach(u => {
      if (!map[u.room]) map[u.room] = []
      map[u.room].push(u)
    })
    return map
  }, [activeUnits])

  // Real patient count per ward
  const summary = useMemo(() => {
    const s = {}
    WARDS.forEach(w => {
      const wd = data[w.id] || {}
      const arr = Object.values(wd)
      const total = getBedUnits(w, layoutCfg).length
      s[w.id] = {
        total,
        occupied: arr.filter(b => b.status === 'occupied').length,
        cleaning: arr.filter(b => b.status === 'cleaning').length,
      }
    })
    return s
  }, [WARDS, data, layoutCfg])

  const totalAll = useMemo(() => {
    let occ = 0, tot = 0
    Object.values(summary).forEach(s => { occ += s.occupied; tot += s.total })
    return { occ, tot, free: tot - occ }
  }, [summary])

  // ── Layout editing (sync to D1 config) ─────────────────────────
  async function saveLayoutCfg(next) {
    setLayoutCfg(next)
    if (typeof window !== 'undefined') localStorage.setItem('ipd_bed_layout', JSON.stringify(next))
    await fetch('/api/config/bed_layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {})
  }

  function splitRoom(roomNum, beds, label) {
    const wl = layoutCfg[activeWard] || {}
    saveLayoutCfg({
      ...layoutCfg,
      [activeWard]: { ...wl, splitRooms: { ...(wl.splitRooms || {}), [roomNum]: { beds, label } } },
    })
    setSplitModal(null)
  }

  function unsplitRoom(roomNum) {
    const roomUnits = activeUnits.filter(u => u.isShared && u.roomNum === roomNum)
    if (roomUnits.some(u => u.bed.status !== 'empty')) {
      alert('ยุบไม่ได้ — ยังมีผู้ป่วยหรือเตียงรอเตรียมห้องอยู่ในห้องนี้')
      return
    }
    if (!confirm(`ยุบห้องรวมกลับเป็นห้องเดี่ยว?`)) return
    const wl = layoutCfg[activeWard] || {}
    const sr = { ...(wl.splitRooms || {}) }
    delete sr[roomNum]
    const rooms = (wl.rooms || []).filter(r => r !== roomNum)
    saveLayoutCfg({ ...layoutCfg, [activeWard]: { ...wl, splitRooms: sr, rooms } })
  }

  function addExtraBed(code, label) {
    if (!code) return
    if (activeUnits.some(u => u.code === String(code))) {
      alert('มีเตียงรหัสนี้อยู่แล้ว')
      return
    }
    const wl = layoutCfg[activeWard] || {}
    saveLayoutCfg({
      ...layoutCfg,
      [activeWard]: { ...wl, extraBeds: [...(wl.extraBeds || []), { code: String(code), label: label || '' }] },
    })
    setExtraModal(false)
  }

  function removeExtraBed(code) {
    const u = activeUnits.find(x => x.code === String(code))
    if (u && u.bed.status !== 'empty') {
      alert('ลบไม่ได้ — เตียงนี้ยังไม่ว่าง')
      return
    }
    if (!confirm(`ลบเตียงแทรก ${code}?`)) return
    const wl = layoutCfg[activeWard] || {}
    saveLayoutCfg({
      ...layoutCfg,
      [activeWard]: { ...wl, extraBeds: (wl.extraBeds || []).filter(b => String(b.code) !== String(code)) },
    })
    setEditingBed(null)
  }

  // ── Bed actions ─────────────────────────────────────────────────
  function onBedClick(unit) {
    const bed = unit.bed
    if (moveMode) {
      if (bed.status === 'occupied') { alert('เตียงปลายทางไม่ว่าง'); return }
      if (moveMode.fromWard === activeWard && moveMode.fromBed === unit.code) {
        setMoveMode(null)
        return
      }
      handleMove(moveMode.fromWard, moveMode.fromBed, activeWard, unit.code)
      return
    }
    setEditingBed({ ward: activeWard, bedNo: unit.code, bed, unit })
  }

  function startMove(bed) {
    setMoveMode({ fromWard: activeWard, fromBed: bed.bed_no, bed })
    setEditingBed(null)
  }

  async function handleMove(fromWard, fromBed, toWard, toBed) {
    const res = await apiMoveBed(fromWard, fromBed, toWard, toBed)
    if (res.ok) {
      setMoveMode(null)
      setReloadKey(k => k + 1)
    } else {
      alert(res.error || 'ย้ายไม่สำเร็จ')
    }
  }

  async function handleSaveBed(form) {
    const ok = await apiSaveBed(form)
    if (ok) {
      setEditingBed(null)
      setReloadKey(k => k + 1)
    }
  }

  async function handleClearWard() {
    if (!confirm(`ล้างข้อมูลผังเตียงของ ${activeWardObj?.name} ทั้งหมด?`)) return
    await apiClearBedsMapWard(activeWard)
    setReloadKey(k => k + 1)
  }

  if (!activeWardObj) return <div className="p-4 text-slate-400">ไม่มี Ward</div>

  return (
    <div className="p-4 space-y-4">
      {/* Ward chip picker + hospital total */}
      <div className="card">
        <div className="flex items-center mb-2 gap-2 flex-wrap">
          <div className="text-sm font-bold text-slate-700 flex-1">🗺 เลือก Ward</div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5">
            ทั้ง รพ. 🛌 <b className="text-red-600">{totalAll.occ}</b> / {totalAll.tot} เตียง
            — ว่าง <b className="text-green-600">{totalAll.free}</b>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {WARDS.map(w => {
            const s = summary[w.id]
            const active = w.id === activeWard
            return (
              <button key={w.id} onClick={() => setActiveWard(w.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                {w.name}
                <span className="ml-2 text-xs opacity-80">
                  🛌 {s.occupied}/{s.total}
                  {s.cleaning > 0 && <span className="text-amber-500"> 🧹 {s.cleaning}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Move mode banner */}
      {moveMode && (
        <div className="card bg-indigo-50 border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-indigo-700 flex-1">
              🔀 กำลังย้ายเตียง: {moveMode.bed.name || moveMode.bed.hn || 'ผู้ป่วย'} — จาก {moveMode.fromWard} {moveMode.fromBed}
              <div className="text-xs text-indigo-600 mt-0.5">คลิกเตียงว่างเพื่อวางลง (เลือก Ward อื่นก่อนได้)</div>
            </div>
            <button onClick={() => setMoveMode(null)}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Ward map */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="text-lg font-bold text-slate-800 flex-1">
            {activeWardObj.name}
            {activeWardObj.type === 'ICU' && <span className="text-xs ml-2 px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">ICU</span>}
            <span className="text-sm text-slate-500 ml-2">รวม {activeUnits.length} เตียง</span>
          </div>
          <button onClick={() => setExtraModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 font-semibold">
            ➕ เพิ่มเตียงแทรก
          </button>
          <button onClick={handleClearWard}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold">
            🗑 ล้างผัง Ward นี้
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs mb-3">
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ background: v.bg, border: `1px solid ${v.border}` }} />
              <span className="text-slate-600 font-semibold">{v.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 border-dashed" style={{ borderColor: '#a855f7' }} />
            <span className="text-slate-600 font-semibold">เตียงแทรก</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-8">⏳ กำลังโหลด...</div>
        ) : (
          <>
            {/* Single rooms */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {singles.map(u => (
                <BedCard key={u.code} unit={u} bed={u.bed}
                  isMoveSrc={moveMode && moveMode.fromWard === activeWard && moveMode.fromBed === u.code}
                  onClick={() => onBedClick(u)} />
              ))}
            </div>

            {/* Shared rooms */}
            {Object.entries(sharedRooms).map(([room, units]) => (
              <div key={room} className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                <div className="flex items-center mb-2 gap-2">
                  <div className="text-sm font-bold text-indigo-700 flex-1">
                    🏠 ห้องรวม {room} ({units.length} เตียง)
                    {units[0]?.label && <span className="text-xs font-semibold text-purple-600 ml-2">— {units[0].label}</span>}
                  </div>
                  <button onClick={() => unsplitRoom(units[0].roomNum)}
                    className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-white">
                    ↩ ยุบเป็นห้องเดี่ยว
                  </button>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
                  {units.map(u => (
                    <BedCard key={u.code} unit={u} bed={u.bed}
                      isMoveSrc={moveMode && moveMode.fromWard === activeWard && moveMode.fromBed === u.code}
                      onClick={() => onBedClick(u)} />
                  ))}
                </div>
              </div>
            ))}

            {/* Extra beds */}
            {extras.length > 0 && (
              <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/40 p-3">
                <div className="text-sm font-bold text-purple-700 mb-2">➕ เตียงแทรก ({extras.length})</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
                  {extras.map(u => (
                    <BedCard key={u.code} unit={u} bed={u.bed}
                      isMoveSrc={moveMode && moveMode.fromWard === activeWard && moveMode.fromBed === u.code}
                      onClick={() => onBedClick(u)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editingBed && (
        <BedEditModal bed={editingBed} onClose={() => setEditingBed(null)}
          onSave={handleSaveBed} onStartMove={startMove}
          canSplit={isRoomWard && !editingBed.unit.isShared && !editingBed.unit.isExtra && editingBed.bed.status === 'empty'}
          onSplit={() => { setSplitModal({ roomNum: editingBed.unit.roomNum, code: editingBed.unit.room }); setEditingBed(null) }}
          onRemoveExtra={editingBed.unit.isExtra ? () => removeExtraBed(editingBed.unit.code) : null} />
      )}

      {splitModal && (
        <SplitRoomModal room={splitModal} onClose={() => setSplitModal(null)} onConfirm={splitRoom} />
      )}
      {extraModal && (
        <ExtraBedModal ward={activeWardObj} onClose={() => setExtraModal(false)} onConfirm={addExtraBed} />
      )}
    </div>
  )
}

// ── Split room modal ──────────────────────────────────────────────
function SplitRoomModal({ room, onClose, onConfirm }) {
  const [beds, setBeds] = useState(6)
  const [label, setLabel] = useState('')
  return (
    <Modal open={true} onClose={onClose} title={`🏠 แตกห้องรวม — ${room.code}`} maxWidth="380px">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">จำนวนเตียง (/1 – /N)</label>
          <input type="number" min="2" max="12" value={beds} onChange={e => setBeds(Math.max(2, +e.target.value || 2))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">ป้ายกำกับ (ไม่บังคับ)</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="เช่น หญิงรวม monitor / รวมชาย"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="text-xs text-indigo-600">
          จะได้เตียง: {room.code}/1 – {room.code}/{beds}
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
          <button onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={() => onConfirm(room.roomNum, beds, label)}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600">✅ แตกห้อง</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Extra bed modal ───────────────────────────────────────────────
function ExtraBedModal({ ward, onClose, onConfirm }) {
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  return (
    <Modal open={true} onClose={onClose} title={`➕ เพิ่มเตียงแทรก — ${ward.name}`} maxWidth="380px">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">รหัสเตียง</label>
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder={ward.type === 'ICU' ? 'เช่น 14, 15' : 'เช่น 1026A'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">ป้ายกำกับ (ไม่บังคับ)</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="เช่น rehab / แทรก 1"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
          <button onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={() => onConfirm(code.trim(), label.trim())}
            className="text-sm px-4 py-2 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600">✅ เพิ่มเตียง</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Bed edit modal ────────────────────────────────────────────────
function BedEditModal({ bed, onClose, onSave, onStartMove, canSplit, onSplit, onRemoveExtra }) {
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      wardId: bed.ward, bedNo: bed.bedNo,
      status: bed.bed.status || 'empty',
      hn: bed.bed.hn || '',
      name: bed.bed.name || '',
      sex: bed.bed.sex || 'M',
      level: bed.bed.level || 1,
      admitted_at: bed.bed.admitted_at || today,
      remark: bed.bed.remark || '',
    }
  })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const title = `${bed.ward} — ${bed.bedNo}${bed.unit?.label ? ` (${bed.unit.label})` : ''}`
  const isOccupied = bed.bed.status === 'occupied'
  const isCleaning = bed.bed.status === 'cleaning'

  function assign() {
    if (!form.name && !form.hn) { alert('กรุณากรอก HN หรือ ชื่อ'); return }
    onSave({ ...form, status: 'occupied', action: 'assign' })
  }
  function discharge() {
    if (!confirm('จำหน่ายผู้ป่วย (เตียงจะเข้าคิวเตรียมห้อง)?')) return
    onSave({ wardId: form.wardId, bedNo: form.bedNo, status: 'cleaning', action: 'discharge' })
  }
  function cleanDone() {
    onSave({ wardId: form.wardId, bedNo: form.bedNo, status: 'empty', action: 'clean_done' })
  }
  function updatePatient() {
    onSave({ ...form, status: 'occupied', action: 'update' })
  }

  return (
    <Modal open={true} onClose={onClose} title={`🛏 ${title}`} maxWidth="480px">
      <div className="space-y-3">
        {isOccupied && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            🛌 เตียงนี้มีผู้ป่วยอยู่ — แก้ข้อมูลด้านล่าง หรือกด <b>ย้ายเตียง</b> / <b>จำหน่าย</b>
          </div>
        )}
        {isCleaning && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            🧹 กำลังรอเตรียมห้อง — กด <b>ทำความสะอาดเสร็จ</b> เพื่อคืนเตียงว่าง
          </div>
        )}

        {!isCleaning && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">HN</label>
              <input value={form.hn} onChange={e => set('hn', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">ชื่อ - นามสกุล</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">เพศ</label>
              <select value={form.sex} onChange={e => set('sex', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="M">ชาย</option>
                <option value="F">หญิง</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Level</label>
              <select value={form.level} onChange={e => set('level', +e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>Lv.{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">วันที่รับเข้า</label>
              <input type="date" value={form.admitted_at} onChange={e => set('admitted_at', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">หมายเหตุ</label>
              <input value={form.remark} onChange={e => set('remark', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
          {!isOccupied && !isCleaning && (
            <button onClick={assign}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600">
              ➕ รับเข้า
            </button>
          )}
          {canSplit && (
            <button onClick={onSplit}
              className="text-sm px-4 py-2 rounded-lg border border-indigo-300 text-indigo-600 font-semibold hover:bg-indigo-50">
              🏠 แตกห้องรวม
            </button>
          )}
          {onRemoveExtra && !isOccupied && !isCleaning && (
            <button onClick={onRemoveExtra}
              className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50">
              🗑 ลบเตียงแทรก
            </button>
          )}
          {isOccupied && (
            <>
              <button onClick={updatePatient}
                className="text-sm px-4 py-2 rounded-lg bg-slate-600 text-white font-semibold hover:bg-slate-700">
                💾 บันทึกแก้ไข
              </button>
              <button onClick={() => onStartMove(bed.bed)}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600">
                🔀 ย้ายเตียง
              </button>
              <button onClick={discharge}
                className="text-sm px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600">
                🏠 จำหน่าย
              </button>
            </>
          )}
          {isCleaning && (
            <button onClick={cleanDone}
              className="text-sm px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600">
              ✅ ทำความสะอาดเสร็จ
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  )
}
