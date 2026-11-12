import { useEffect, useRef, useState } from 'react'
import { getHeatmapCellColor, type HeatmapCell, type HeatmapResult } from '../lib/analytics'

interface StreakHeatmapProps {
  data: HeatmapResult
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

export default function StreakHeatmap({ data }: StreakHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [data.weeks.length])

  return (
    <div className="rounded-[22px] border border-[#242428] bg-[#161618] p-[18px]">
      <h2 className="text-[17px] font-bold text-[#F5F5F7]">
        {data.totalContributions} contributions in the last 18 weeks
      </h2>

      <div className="mt-3.5 flex items-start">
        {/* Left Day Labels */}
        <div className="mr-2 flex flex-col gap-1 pt-[22px]">
          {DAY_LABELS.map((label, idx) => (
            <div
              key={idx}
              className="flex h-[14px] w-[28px] items-center text-[10px] font-medium text-[#8E8E93]"
            >
              {label}
            </div>
          ))}
        </div>

        {/* 18-Week Scrollable Grid */}
        <div
          ref={scrollRef}
          className="flex flex-1 gap-1 overflow-x-auto pb-1 no-scrollbar"
        >
          {data.weeks.map((week, weekIdx) => {
            const firstDay = week[0]
            return (
              <div key={weekIdx} className="flex flex-col items-center gap-1">
                <div className="flex h-[18px] w-[14px] items-center justify-start">
                  {(firstDay?.isFirstWeekOfMonth || weekIdx === 0) && (
                    <span className="whitespace-nowrap text-[10px] font-semibold text-[#A1A1AA]">
                      {firstDay?.monthName}
                    </span>
                  )}
                </div>

                {week.map((cell) => {
                  const bg = getHeatmapCellColor(cell.count)
                  const isSelected = selectedCell?.dateString === cell.dateString
                  return (
                    <button
                      key={cell.dateString}
                      type="button"
                      aria-label={`${cell.dateString}: ${cell.count} habits completed`}
                      onClick={() => setSelectedCell(cell)}
                      style={{ backgroundColor: bg }}
                      className={`h-[14px] w-[14px] rounded-[3.5px] transition-transform active:scale-90 ${
                        isSelected
                          ? 'border-[1.5px] border-white'
                          : 'border-[0.5px] border-[#2C2C30]'
                      }`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Cell Inspection Pill */}
      {selectedCell && (
        <div className="mt-2.5 rounded-[10px] bg-[#0D0D0E] px-3 py-1.5 text-[12px] font-medium text-[#FF6A00]">
          {selectedCell.dateString}: {selectedCell.count} habits completed
        </div>
      )}

      {/* Footer Legend */}
      <div className="mt-3.5 flex items-center justify-between">
        <span className="text-[11px] text-[#8E8E93]">
          Activity consistency matrix
        </span>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] text-[#8E8E93]">Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span
              key={lvl}
              style={{ backgroundColor: getHeatmapCellColor(lvl) }}
              className="h-[11px] w-[11px] rounded-[2.5px] border border-[#2C2C30]"
            />
          ))}
          <span className="ml-1 text-[10px] text-[#8E8E93]">More</span>
        </div>
      </div>
    </div>
  )
}

