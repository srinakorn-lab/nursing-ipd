'use client'
import { useState, useEffect } from 'react'
import { DEFAULT_CFG, SETTINGS_PWD, WARDS } from '../../lib/constants'
import { saveWardBeds, loadWardBeds, apiLoadConfig } from '../../lib/storage'
import { WARD_ROOM_META, roomCode } from '../../lib/bedLayout'

export default function SettingsTab({ cfg, onSaveCfg }) {
  const [unlocked, setUnlocked] = useState(false)
  const [pwd, setPwd] = useState('')
  const [form, setForm] = useState({})
  const [beds, setBeds] = useState({})
  const [bedsSaved, setBedsSaved] = useState(false)
  const [layout, setLayout] = useState({})       // { wardId: { rooms: ['01','13'], bedsPerRoom: 6 } }
  const [layoutSaved, setLayoutSaved] = useState(false)

  useEffect(() => {
    if (unlocked) {
      setForm({ ...cfg })
      const saved = loadWardBeds()
      const b = {}
      WARDS.forEach(w => { b[w.id] = saved[w.id] ?? w.beds })
      setBeds(b)
      apiLoadConfig('bed_layout').then(d => {
        if (d && typeof d === 'object') setLayout(d)
      })
    }
  }, [unlocked, cfg])

  function checkPwd() {
    if (pwd === SETTINGS_PWD) { setUnlocked(true); setPwd('') }
    else { alert('รหัสผ่านไม่ถูกต้อง'); setPwd('') }
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setW(wt, k, v) { setForm(f => ({ ...f, [wt]: { ...f[wt], [k]: +v || 0 } })) }

  function handleSave() {
    const newCfg = {
      hours:       +form.hours,
      pn_coef:     +form.pn_coef,
      na_coef:     +form.na_coef,
      ward_ratio:  +form.ward_ratio,
      icu_ratio:   +form.icu_ratio,
      thr_over:    +form.thr_over,
      thr_opt_lo:  +form.thr_opt_lo,
      thr_opt_hi:  +form.thr_opt_hi,
      thr_under:   +form.thr_under,
      thr_overload: +form.thr_overload,
      thr_opt_lo_day:    +form.thr_opt_lo_day,
      thr_opt_hi_day:    +form.thr_opt_hi_day,
      thr_under_day:     +form.thr_under_day,
      thr_overload_day:  +form.thr_overload_day,
      thr_opt_lo_night:    +form.thr_opt_lo_night,
      thr_opt_hi_night:    +form.thr_opt_hi_night,
      thr_under_night:     +form.thr_under_night,
      thr_overload_night:  +form.thr_overload_night,
      w_ward_day:   form.w_ward_day,
      w_ward_night: form.w_ward_night,
      w_icu_day:    form.w_icu_day,
      w_icu_night:  form.w_icu_night,
    }
    onSaveCfg(newCfg)
    alert('บันทึกการตั้งค่าแล้ว')
  }

  function handleSaveBeds() {
    const data = {}
    WARDS.forEach(w => { data[w.id] = +beds[w.id] || w.beds })
    saveWardBeds(data)
    setBedsSaved(true)
    setTimeout(() => setBedsSaved(false), 2000)
  }

  function setLayoutRooms(wardId, txt) {
    // parse "01, 13" → ['01','13'], normalize to 2 digits
    const rooms = txt.split(',').map(s => s.trim()).filter(Boolean)
      .map(s => s.padStart(2, '0')).filter(s => /^\d{2}$/.test(s))
    setLayout(l => ({ ...l, [wardId]: { ...l[wardId], rooms, _txt: txt } }))
  }
  function setLayoutBedsPerRoom(wardId, n) {
    setLayout(l => ({ ...l, [wardId]: { ...l[wardId], bedsPerRoom: Math.max(2, +n || 6) } }))
  }

  async function handleSaveLayout() {
    const clean = {}
    Object.entries(layout).forEach(([wid, v]) => {
      if (v?.rooms?.length) clean[wid] = { rooms: v.rooms, bedsPerRoom: v.bedsPerRoom || 6 }
    })
    localStorage.setItem('ipd_bed_layout', JSON.stringify(clean))
    await fetch('/api/config/bed_layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    }).catch(() => {})
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }

  function handleReset() {
    if (!confirm('รีเซ็ตค่าทั้งหมดเป็น default?')) return
    onSaveCfg({ ...DEFAULT_CFG })
    setForm({ ...DEFAULT_CFG })
  }

  function handleClearData() {
    if (!confirm('⚠️ ลบข้อมูลทั้งหมด? ไม่สามารถกู้คืนได้')) return
    Object.keys(localStorage).filter(k => k.startsWith('ipd_entries_') || k.startsWith('ipd_daily_')).forEach(k => localStorage.removeItem(k))
    alert('ลบข้อมูลเรียบร้อย')
    window.location.reload()
  }

  const numField = (label, value, onChange, step = 1) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} step={step}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
    </div>
  )
  const wField = (wt, key, label) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <input type="number" step="0.001" value={form[wt]?.[key] ?? ''} onChange={e => setW(wt, key, e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
    </div>
  )

  if (!unlocked) {
    return (
      <div className="p-4 flex justify-center">
        <div className="card max-w-sm w-full text-center py-8">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-base font-bold text-slate-800 mb-1">หน้าตั้งค่าระบบ</h2>
          <p className="text-xs text-slate-500 mb-4">ต้องใส่รหัสผ่านเพื่อเข้าถึง</p>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkPwd()}
            placeholder="รหัสผ่าน"
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-lg tracking-widest mb-3 focus:outline-none focus:border-indigo-400" />
          <button onClick={checkPwd} className="w-full py-2.5 rounded-xl text-white font-semibold" style={{ background: '#6366f1' }}>
            เข้าสู่หน้าตั้งค่า
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Action bar */}
      <div className="card py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-700">⚙️ ตั้งค่าพารามิเตอร์ระบบ</div>
        <div className="flex gap-2">
          <button onClick={handleClearData} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">🗑 ล้างข้อมูล</button>
          <button onClick={handleReset} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">↺ รีเซ็ต</button>
          <button onClick={handleSave} className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: '#6366f1' }}>💾 บันทึกการตั้งค่า</button>
          <button onClick={() => setUnlocked(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">🔒 ล็อก</button>
        </div>
      </div>

      {/* Working hours */}
      <div className="card">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3">⏱ ชั่วโมงทำงาน / เวร</div>
        <div className="grid grid-cols-3 gap-3">
          {numField('ชม. ทำงานจริง/เวร', form.hours, v => setF('hours', v))}
          {numField('PN Coefficient', form.pn_coef, v => setF('pn_coef', v), 0.01)}
          {numField('NA Coefficient', form.na_coef, v => setF('na_coef', v), 0.01)}
        </div>
      </div>

      {/* Ratios */}
      <div className="card">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3">👥 เป้าหมาย RN:Patient Ratio</div>
        <div className="grid grid-cols-2 gap-3">
          {numField('WARD (1:?)', form.ward_ratio, v => setF('ward_ratio', v))}
          {numField('ICU/CCU/NCU (1:?)', form.icu_ratio, v => setF('icu_ratio', v))}
        </div>
      </div>

      {/* Thresholds */}
      <div className="card">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3">🎯 เกณฑ์ Productivity Status (ทั่วไป — fallback)</div>
        <div className="grid grid-cols-5 gap-3">
          {numField('Over Staff < ?%', form.thr_over, v => setF('thr_over', v))}
          {numField('Optimal lo ?%', form.thr_opt_lo, v => setF('thr_opt_lo', v))}
          {numField('Optimal hi ?%', form.thr_opt_hi, v => setF('thr_opt_hi', v))}
          {numField('Under Staff > ?%', form.thr_under, v => setF('thr_under', v))}
          {numField('Overload > ?%', form.thr_overload, v => setF('thr_overload', v))}
        </div>
      </div>

      {/* Per-shift thresholds */}
      <div className="card">
        <div className="text-xs font-bold text-blue-600 uppercase mb-3">☀️ เกณฑ์ DAY</div>
        <div className="grid grid-cols-4 gap-3">
          {numField('Optimal lo ?%',     form.thr_opt_lo_day,    v => setF('thr_opt_lo_day', v))}
          {numField('Optimal hi ?%',     form.thr_opt_hi_day,    v => setF('thr_opt_hi_day', v))}
          {numField('Under Staff > ?%',  form.thr_under_day,     v => setF('thr_under_day', v))}
          {numField('Overload > ?%',     form.thr_overload_day,  v => setF('thr_overload_day', v))}
        </div>
      </div>
      <div className="card">
        <div className="text-xs font-bold text-purple-600 uppercase mb-3">🌙 เกณฑ์ NIGHT</div>
        <div className="grid grid-cols-4 gap-3">
          {numField('Optimal lo ?%',     form.thr_opt_lo_night,    v => setF('thr_opt_lo_night', v))}
          {numField('Optimal hi ?%',     form.thr_opt_hi_night,    v => setF('thr_opt_hi_night', v))}
          {numField('Under Staff > ?%',  form.thr_under_night,     v => setF('thr_under_night', v))}
          {numField('Overload > ?%',     form.thr_overload_night,  v => setF('thr_overload_night', v))}
        </div>
      </div>

      {/* Ward weights DAY */}
      <div className="card">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3">⚖️ ค่าน้ำหนัก Ward — DAY ☀️ (ชม./ราย)</div>
        <div className="grid grid-cols-4 gap-3">
          {['lv1','lv2','lv3','lv4','lv5','adm','trf','ods'].map(k => wField('w_ward_day', k, k.toUpperCase()))}
        </div>
      </div>

      {/* Ward weights NIGHT */}
      <div className="card">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3">⚖️ ค่าน้ำหนัก Ward — NIGHT 🌙 (ชม./ราย)</div>
        <div className="grid grid-cols-4 gap-3">
          {['lv1','lv2','lv3','lv4','lv5','adm','trf'].map(k => wField('w_ward_night', k, k.toUpperCase()))}
        </div>
      </div>

      {/* ICU weights */}
      <div className="card">
        <div className="text-xs font-bold text-slate-600 uppercase mb-3">⚖️ ค่าน้ำหนัก ICU/CCU/NCU — DAY ☀️</div>
        <div className="grid grid-cols-3 gap-3">
          {['lv4','lv5','adm'].map(k => wField('w_icu_day', k, k.toUpperCase()))}
        </div>
        <div className="text-xs font-bold text-slate-600 uppercase mt-4 mb-3">⚖️ ค่าน้ำหนัก ICU/CCU/NCU — NIGHT 🌙</div>
        <div className="grid grid-cols-3 gap-3">
          {['lv4','lv5','adm'].map(k => wField('w_icu_night', k, k.toUpperCase()))}
        </div>
      </div>

      {/* Ward beds */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-600 uppercase">🛏 จำนวนเตียงแต่ละ Ward</div>
          <button onClick={handleSaveBeds} className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: '#6366f1' }}>
            {bedsSaved ? '✅ บันทึกแล้ว' : '💾 บันทึก'}
          </button>
        </div>
        <div className="grid grid-cols-4 @lg:grid-cols-6 gap-3">
          {WARDS.map(w => (
            <div key={w.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="text-xs font-bold text-slate-500 mb-1">{w.name}</div>
              <input type="number" min="1" value={beds[w.id] ?? w.beds}
                onChange={e => setBeds(b => ({ ...b, [w.id]: +e.target.value || 1 }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-indigo-400" />
              <div className={`text-xs mt-1 text-center font-semibold ${w.type === 'ICU' ? 'text-purple-500' : 'text-blue-500'}`}>{w.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bed map layout: shared rooms */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-bold text-slate-600 uppercase">🗺 ผังเตียง — ห้องรวม</div>
          <button onClick={handleSaveLayout} className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: '#6366f1' }}>
            {layoutSaved ? '✅ บันทึกแล้ว' : '💾 บันทึก'}
          </button>
        </div>
        <div className="text-xs text-slate-400 mb-3">
          แต่ละ Ward มี 25 ห้อง — ระบุเลขห้องที่เป็น "ห้องรวม" (คั่นด้วย , เช่น 01,13) ห้องรวมจะแตกเป็นเตียง /1 ถึง /N
        </div>
        <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-3">
          {WARDS.filter(w => WARD_ROOM_META[w.id]).map(w => {
            const l = layout[w.id] || {}
            const txt = l._txt ?? (l.rooms || []).join(',')
            const preview = (l.rooms || []).map(r => roomCode(w.id, r)).join(', ')
            return (
              <div key={w.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-600 mb-1.5">
                  {w.name} <span className="text-slate-400 font-normal">({roomCode(w.id, '01')} – {roomCode(w.id, '25')})</span>
                </div>
                <div className="flex gap-2">
                  <input value={txt} placeholder="เช่น 01,13"
                    onChange={e => setLayoutRooms(w.id, e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400" />
                  <input type="number" min="2" max="12" value={l.bedsPerRoom ?? 6}
                    onChange={e => setLayoutBedsPerRoom(w.id, e.target.value)}
                    title="เตียงต่อห้องรวม"
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-indigo-400" />
                </div>
                {preview && <div className="text-xs text-indigo-600 mt-1.5">🏠 {preview} × {l.bedsPerRoom ?? 6} เตียง</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
