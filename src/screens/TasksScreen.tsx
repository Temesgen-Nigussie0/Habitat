import { useState } from 'react'
import { Search, Grid2X2, ChevronDown } from 'lucide-react'
import { format, getDaysInMonth } from 'date-fns'
import Screen from '../components/Screen'
import ProgressRing from '../components/ProgressRing'
import FAB from '../components/FAB'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function TasksScreen() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [showMonthDrop, setShowMonthDrop] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const daysCount = getDaysInMonth(new Date(now.getFullYear(), selectedMonth, 1))
  const days = Array.from({ length: daysCount }, (_, i) => {
    const d = new Date(now.getFullYear(), selectedMonth, i + 1)
    return { num: i + 1, name: format(d, 'EEE') }
  })

  return (
    <Screen>
      <div className="px-5 pt-4 space-y-5">
        {/* Top bar: grid button + search */}
        <div className="flex items-center gap-3">
          <button
            className="w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0 border-2"
            style={{ backgroundColor: '#14141A', borderColor: '#FF6A00' }}
          >
            <Grid2X2 size={24} color="#FF6A00" />
          </button>
          <div
            className="flex-1 flex items-center gap-2 rounded-[16px] px-4 border h-14"
            style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
          >
            <Search size={18} color="#6E6E7A" />
            <input
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: 16 }}  /* 16px prevents iOS zoom */
            />
          </div>
        </div>

        {/* Timeline header + month picker */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Your Timeline</h2>
          <div className="relative">
            <button
              onClick={() => setShowMonthDrop(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[12px]"
              style={{ backgroundColor: '#14141A' }}
            >
              <span className="text-orange font-bold text-sm">{MONTHS[selectedMonth]}</span>
              <ChevronDown size={14} color="#FF6A00" />
            </button>
            {showMonthDrop && (
              <div
                className="absolute right-0 top-full mt-1 rounded-[14px] border z-20 overflow-hidden"
                style={{ backgroundColor: '#1B1B24', borderColor: '#22222E', minWidth: 140 }}
              >
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(i); setShowMonthDrop(false) }}
                    className="block w-full text-left px-4 py-2.5 text-sm"
                    style={{
                      color: i === selectedMonth ? '#FF6A00' : '#F7F7FA',
                      fontWeight: i === selectedMonth ? 700 : 400,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Day strip */}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {days.map(d => (
            <button
              key={d.num}
              onClick={() => setSelectedDay(d.num)}
              className="flex-shrink-0 flex flex-col items-center justify-center rounded-[16px] border gap-0.5"
              style={{
                width: 46,
                height: 60,
                backgroundColor: d.num === selectedDay ? '#FF6A00' : '#14141A',
                borderColor: d.num === selectedDay ? '#FF6A00' : '#22222E',
              }}
            >
              <span
                className="text-[15px] font-bold"
                style={{ color: d.num === selectedDay ? '#fff' : '#F7F7FA' }}
              >
                {d.num}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: d.num === selectedDay ? 'rgba(255,255,255,0.8)' : '#6E6E7A' }}
              >
                {d.name}
              </span>
            </button>
          ))}
        </div>

        {/* Priority Matrix header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">Priority Matrix</h2>
          <span className="text-text-tertiary text-xs">0 Urgent/High • 0 Total</span>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left column: low priority + daily task ring */}
          <div className="flex flex-col gap-3">
            <div className="rounded-[22px] p-4" style={{ backgroundColor: '#F2F2F5' }}>
              <p className="text-black text-[13px] font-black">Low Priority Tasks</p>
              <p className="text-gray-500 text-[11px] mt-2">No low priority tasks</p>
            </div>
            <div
              className="rounded-[18px] border p-4"
              style={{ backgroundColor: '#14141A', borderColor: '#22222E' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary text-[13px] font-bold">Daily Task</p>
                  <p className="text-text-tertiary text-[11px] mt-0.5">0/0 done</p>
                </div>
                <ProgressRing value={0} size={42} color="white" trackColor="rgba(255,255,255,0.15)">
                  <span className="text-[9px] font-bold text-white">0%</span>
                </ProgressRing>
              </div>
            </div>
          </div>

          {/* Right: medium priority */}
          <div className="rounded-[22px] p-4 bg-orange">
            <p className="text-white text-[13px] font-black">Medium Priority Tasks</p>
            <p className="text-white/80 text-[11px] mt-2">No medium priority tasks</p>
          </div>
        </div>

        {/* Today's Task list */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-3">Today's Task</h2>
          <div
            className="rounded-[20px] border p-5 text-center"
            style={{ backgroundColor: '#1B1B24', borderColor: '#22222E' }}
          >
            <p className="text-text-tertiary text-sm">No tasks yet. Tap + to add one.</p>
          </div>
        </div>
      </div>
      <FAB />
    </Screen>
  )
}

