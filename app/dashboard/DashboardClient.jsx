'use client'
import { useState, useMemo, useCallback } from 'react'
import { WARDS } from '../../lib/constants'
import { useConfig } from '../../lib/hooks/useConfig'
import { useEntries } from '../../lib/hooks/useEntries'
import { useOos } from '../../lib/hooks/useOos'
import { saveDailyEntry } from '../../lib/storage'
import { calcProd, calcPts } from '../../lib/calc'

import ViewSwitcher from '../../components/layout/ViewSwitcher'
import Header from '../../components/layout/Header'
import NavTabs from '../../components/layout/NavTabs'
import OverviewTab from '../../components/tabs/OverviewTab'
import TableTab from '../../components/tabs/TableTab'
import ChartTab from '../../components/tabs/ChartTab'
import DailyTab from '../../components/tabs/DailyTab'
import ReportTab from '../../components/tabs/ReportTab'
import WardReportTab from '../../components/tabs/WardReportTab'
import BedAvailabilityTab from '../../components/tabs/BedAvailabilityTab'
import SettingsTab from '../../components/tabs/SettingsTab'
import EntryModal from '../../components/modals/EntryModal'
import OosModal from '../../components/modals/OosModal'

const now = new Date()
const CUR_YEAR  = now.getFullYear() + 543
const CUR_MONTH = now.getMonth() + 1

export default function DashboardPage() {
  const [view, setView]       = useState('desktop')
  const [activeTab, setTab]   = useState('overview')
  const [selYear, setYear]    = useState(CUR_YEAR)
  const [selMonth, setMonth]  = useState(CUR_MONTH)
  const [selected, setSelected] = useState(WARDS.map(w => w.id))

  const [cfg, saveCfg]   = useConfig()
  const [entries, saveEntries, reloadEntries] = useEntries(selYear, selMonth)
  const [oos, saveOos]   = useOos()

  // Entry modal
  const [entryOpen, setEntryOpen]     = useState(false)
  const [entryInitial, setEntryInit]  = useState(null)
  // OOS modal
  const [oosOpen, setOosOpen]   = useState(false)
  const [oosWardId, setOosWard] = useState(null)

  function openEntry(initial = null) { setEntryInit(initial); setEntryOpen(true) }
  function openOos(wardId) { setOosWard(wardId); setOosOpen(true) }

  const [dataVersion, setDataVersion] = useState(0)
  async function handleSaveEntry(form) {
    const updated = { ...entries }
    if (!updated[form.wardId]) updated[form.wardId] = {}
    updated[form.wardId][form.shift.toLowerCase()] = form
    const d = new Date(form.date).getDate()
    await Promise.all([
      saveEntries(updated),
      saveDailyEntry(selYear, selMonth, form.wardId, d, form.shift, form),
    ])
    setDataVersion(v => v + 1)  // trigger child re-fetch
  }

  function handleSaveOos(wardId, data) {
    const updated = { ...oos, [wardId]: data }
    saveOos(updated)
  }

  function openDailyEdit(wardId, day) {
    // Open entry modal pre-filled for this ward/day
    const dateStr = `${selYear - 543}-${String(selMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    openEntry({ wardId, date: dateStr, shift: 'DAY' })
  }

  const toggleWard = useCallback(id => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }, [])

  const frameStyle = {
    desktop: { maxWidth: '100%' },
    tablet:  { maxWidth: '768px', margin: '0 auto', boxShadow: '0 0 0 8px #334155, 0 20px 60px rgba(0,0,0,0.4)', borderRadius: '16px', overflow: 'hidden' },
    mobile:  { maxWidth: '390px', margin: '0 auto', boxShadow: '0 0 0 10px #1e293b, 0 20px 60px rgba(0,0,0,0.5)', borderRadius: '40px', overflow: 'hidden' },
  }

  const tabProps = { entries, cfg, oos, selected,
    onToggle: toggleWard,
    onSelectAll: () => setSelected(WARDS.map(w => w.id)),
    onClearAll: () => setSelected([]),
    onOpenOos: openOos,
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <ViewSwitcher active={view} onChange={setView} />
      <div style={view !== 'desktop' ? { padding: '16px', background: '#0f172a' } : {}}>
        <div style={frameStyle[view]}>
          <Header year={selYear} month={selMonth}
            onYearChange={y => { setYear(y); }}
            onMonthChange={m => { setMonth(m); }}
            onOpenEntry={() => openEntry()} />
          <NavTabs active={activeTab} onChange={setTab} />
          <div className="min-h-[calc(100vh-120px)]">
            {activeTab === 'overview'   && <OverviewTab   {...tabProps} year={selYear} month={selMonth} dataVersion={dataVersion} />}
            {activeTab === 'table'      && <TableTab      {...tabProps} year={selYear} month={selMonth} dataVersion={dataVersion} />}
            {activeTab === 'chart'      && <ChartTab      cfg={cfg} oos={oos} year={selYear} month={selMonth} />}
            {activeTab === 'daily'      && <DailyTab      cfg={cfg} year={selYear} month={selMonth} onOpenDailyEdit={openDailyEdit} />}
            {activeTab === 'wardreport' && <WardReportTab cfg={cfg} year={selYear} month={selMonth} />}
            {activeTab === 'beds'       && <BedAvailabilityTab />}
            {activeTab === 'report'     && <ReportTab     cfg={cfg} year={selYear} month={selMonth} oos={oos} entries={entries} />}
            {activeTab === 'settings'   && <SettingsTab   cfg={cfg} onSaveCfg={saveCfg} />}
          </div>
        </div>
      </div>

      <EntryModal open={entryOpen} onClose={() => setEntryOpen(false)}
        onSave={handleSaveEntry} initialData={entryInitial} year={selYear} month={selMonth} />
      <OosModal open={oosOpen} wardId={oosWardId} oosData={oos}
        onClose={() => setOosOpen(false)} onSave={handleSaveOos} />
    </div>
  )
}
