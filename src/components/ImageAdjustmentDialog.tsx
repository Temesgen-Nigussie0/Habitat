import { useRef, useState } from 'react'
import { RotateCcw, RotateCw, X, ZoomIn } from 'lucide-react'

interface ImageAdjustmentDialogProps {
  imageSrc: string | null
  mode: 'avatar' | 'banner'
  onClose: () => void
  onConfirm: (dataUrl: string) => Promise<void> | void
}

export default function ImageAdjustmentDialog({
  imageSrc,
  mode,
  onClose,
  onConfirm,
}: ImageAdjustmentDialogProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)

  const draggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  if (!imageSrc) return null

  const viewportW = mode === 'avatar' ? 220 : 300
  const viewportH = mode === 'avatar' ? 220 : 168

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const dx = e.clientX - lastPointerRef.current.x
    const dy = e.clientY - lastPointerRef.current.y
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
  }

  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const handleReset = () => {
    setScale(1)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
  }

  const handleConfirm = async () => {
    const img = imgRef.current
    if (!img || isSaving) return
    setIsSaving(true)
    try {
      const outW = mode === 'avatar' ? 512 : 1280
      const outH = mode === 'avatar' ? 512 : Math.round(1280 * (viewportH / viewportW))

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#0D0D0E'
      ctx.fillRect(0, 0, outW, outH)

      const ratioX = outW / viewportW
      const ratioY = outH / viewportH

      // Cover-fit base dimensions inside viewport
      const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight)
      const vpAspect = viewportW / viewportH
      let drawW = viewportW
      let drawH = viewportH
      if (imgAspect > vpAspect) {
        drawH = viewportH
        drawW = viewportH * imgAspect
      } else {
        drawW = viewportW
        drawH = viewportW / imgAspect
      }

      ctx.save()
      ctx.translate(
        outW / 2 + offset.x * ratioX,
        outH / 2 + offset.y * ratioY
      )
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(scale, scale)
      ctx.drawImage(
        img,
        (-drawW * ratioX) / 2,
        (-drawH * ratioY) / 2,
        drawW * ratioX,
        drawH * ratioY
      )
      ctx.restore()

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      await onConfirm(dataUrl)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[390px] rounded-[28px] border border-[#2C2C30] bg-[#161618] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-[#F5F5F7]">
            {mode === 'avatar' ? 'Adjust Profile Picture' : 'Adjust Banner Photo'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#242428] text-[#A1A1AA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1.5 text-[12px] text-[#8E8E93]">
          Pinch or use sliders to zoom, drag to position, or tilt.
        </p>

        {/* Crop Viewport */}
        <div className="mt-4 flex justify-center">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: viewportW,
              height: viewportH,
              touchAction: 'none',
            }}
            className={`relative overflow-hidden border-[3px] border-[#FF6A00] bg-[#06060A] select-none ${
              mode === 'avatar' ? 'rounded-full' : 'rounded-[18px]'
            }`}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Preview"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
              }}
              className="h-full w-full object-cover pointer-events-none"
            />
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="mt-5 flex items-center gap-2.5">
          <ZoomIn className="h-4 w-4 shrink-0 text-[#FF6A00]" />
          <span className="w-[74px] shrink-0 text-[12px] text-[#A1A1AA]">
            Zoom {Math.round(scale * 100)}%
          </span>
          <input
            type="range"
            min="0.8"
            max="3.0"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-[#FF6A00]"
          />
        </div>

        {/* Tilt Slider */}
        <div className="mt-3 flex items-center gap-2.5">
          <RotateCw className="h-4 w-4 shrink-0 text-[#FF6A00]" />
          <span className="w-[74px] shrink-0 text-[12px] text-[#A1A1AA]">
            Tilt {Math.round(rotation)}°
          </span>
          <input
            type="range"
            min="-45"
            max="45"
            step="1"
            value={rotation}
            onChange={(e) => setRotation(parseFloat(e.target.value))}
            className="flex-1 accent-[#FF6A00]"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-[16px] bg-[#242428] text-[13px] font-semibold text-[#A1A1AA] active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirm}
            className="min-h-[48px] flex-[1.5] rounded-[16px] bg-[#FF6A00] text-[14px] font-bold text-white active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

