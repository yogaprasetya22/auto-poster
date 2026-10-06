import { useState, useRef, useEffect } from 'react'
import { useComposerStore } from '../store/use-composer-store'
import { Play, Pause } from 'lucide-react'

interface PhoneSimulatorProps {
  channel: 'tiktok' | 'reels' | 'threads' | 'facebook'
  setChannel: (c: 'tiktok' | 'reels' | 'threads' | 'facebook') => void
}

export function PhoneSimulator({ channel, setChannel }: PhoneSimulatorProps) {
  const { contentText, media, mediaItems, title } = useComposerStore()
  const [showSafeZone, setShowSafeZone] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const items = mediaItems?.length > 0 ? mediaItems : media ? [media] : []
  const activeMedia = items[currentSlideIndex] || items[0] || null

  useEffect(() => {
    if (currentSlideIndex >= items.length && items.length > 0) {
      setCurrentSlideIndex(0)
    }
  }, [items.length, currentSlideIndex])

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, activeMedia])

  function handlePointerDown(e: React.PointerEvent) {
    if (items.length <= 1) return
    setDragStartX(e.clientX)
    setDragOffset(0)
    setIsDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || dragStartX === null || items.length <= 1) return
    const diff = e.clientX - dragStartX
    setDragOffset(diff)
  }

  function handlePointerUp() {
    if (!isDragging) return
    setIsDragging(false)
    if (dragOffset > 40 && currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1)
    } else if (dragOffset < -40 && currentSlideIndex < items.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1)
    }
    setDragStartX(null)
    setDragOffset(0)
  }

  function togglePlayPause() {
    if (Math.abs(dragOffset) > 5) return // Cegah play/pause jika sedang swipe
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration)
      }
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration)
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!videoRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const targetTime = pos * duration
    videoRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  function formatTime(sec: number) {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Header with Destination Simulator Tabs */}
      <div className="flex flex-col gap-2 bg-white dark:bg-[#111216] p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-black dark:text-white">smartphone</span>
            <span className="text-xs font-semibold text-black dark:text-white">Canvas Preview 9:16</span>
          </div>
          {/* Safe Zone Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSafeZone}
              onChange={(e) => setShowSafeZone(e.target.checked)}
              className="accent-black dark:accent-white size-3.5 rounded"
            />
            <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">Safe Zone Grid</span>
          </label>
        </div>

        {/* Channel Simulator Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#F3F4F6] dark:bg-[#16181D] rounded-lg border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]">
          {(['tiktok', 'reels', 'threads', 'facebook'] as const).map((tab) => {
            const active = channel === tab
            const labelMap = { tiktok: 'TikTok', reels: 'IG Reels', threads: 'Threads', facebook: 'FB Reels' }
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setChannel(tab)}
                className={`py-1 rounded text-xs transition-all font-medium cursor-pointer ${
                  active
                    ? 'text-white bg-black dark:text-black dark:bg-white font-semibold shadow-xs'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-black dark:hover:text-white'
                }`}
              >
                {labelMap[tab]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Smartphone Hardware Frame (iPhone 16 Pro Style) */}
      <div className="relative w-full max-w-[325px] mx-auto bg-[#0A0A0A] rounded-[2.8rem] p-3 shadow-2xl flex flex-col aspect-[9/18.5] select-none overflow-hidden border-[5px] border-[#262626] ring-1 ring-black">
        <div className="relative w-full h-full bg-black rounded-[2.2rem] overflow-hidden flex flex-col justify-between">
          
          {/* Top Status Bar & Dynamic Island */}
          <div className="absolute top-0 inset-x-0 h-8 px-5 flex items-center justify-between z-30 text-[10px] text-white font-medium pointer-events-none">
            <span className="tracking-tight">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {/* Dynamic Island pill */}
            <div className="w-[84px] h-[22px] bg-black rounded-full flex items-center justify-end px-2 border border-white/10 shadow-inner">
              <span className="size-2 rounded-full bg-[#1C1C1E]"></span>
            </div>
            <div className="flex items-center">
              <span className="font-mono text-[11px] font-bold tracking-wider text-white/90">5G</span>
            </div>
          </div>

          {/* Video Player Canvas (Click to Play/Pause, Pointer Drag to Swipe) */}
          <div 
            onClick={togglePlayPause}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`absolute inset-0 w-full h-full z-0 overflow-hidden bg-neutral-950 flex items-center justify-center select-none ${
              items.length > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
            }`}
          >
            {items.length > 0 ? (
              <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                {/* Carousel Track with smooth horizontal drag / translate */}
                <div
                  className={`flex w-full h-full ${
                    isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'
                  }`}
                  style={{
                    transform: `translateX(calc(-${currentSlideIndex * 100}% + ${dragOffset}px))`,
                  }}
                >
                  {items.map((item, idx) => {
                    const isVideo = item.mimeType.startsWith('video/')
                    const url = item.streamUrl || item.lh3Url
                    return (
                      <div
                        key={item.fileId || idx}
                        className="w-full h-full shrink-0 flex items-center justify-center relative bg-black select-none"
                      >
                        {isVideo ? (
                          <video
                            ref={idx === currentSlideIndex ? videoRef : undefined}
                            src={url}
                            className="w-full h-full object-cover pointer-events-none"
                            autoPlay
                            playsInline
                            loop
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                          />
                        ) : (
                          <img
                            src={url}
                            alt={item.fileName}
                            className="w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Floating Pause Indicator Overlay for active video */}
                {activeMedia?.mimeType.startsWith('video/') && !isPlaying && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all pointer-events-none">
                    <div className="size-14 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white shadow-2xl">
                      <Play size={24} className="ml-1 fill-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-[#18191E] via-[#0D0E12] to-black flex flex-col items-center justify-center text-white/40 p-4 text-center">
                <span className="material-symbols-outlined text-4xl mb-2">perm_media</span>
                <p className="text-[11px] font-mono">Belum ada media dipilih</p>
                <p className="text-[9px] text-white/30 mt-1">Upload gambar/video atau slide di sebelah kiri</p>
              </div>
            )}

            {/* Gradient Overlays for High Legibility */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>

            {/* Carousel Slide Indicators Dots (Positioned directly below the center media) */}
            {items.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-[28%] inset-x-0 z-30 flex items-center justify-center pointer-events-auto"
              >
                <div className="flex items-center px-2.5 py-1.5 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 shadow-lg">
                  {/* Dots */}
                  <div className="flex items-center gap-1.5">
                    {items.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          currentSlideIndex === idx ? 'bg-white w-4' : 'bg-white/40 w-1.5 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Safe Zone Boundary Overlay */}
          {showSafeZone && (
            <div className="absolute inset-x-3 top-10 bottom-14 border border-dashed border-amber-300/70 rounded-2xl pointer-events-none z-20 flex flex-col justify-between p-2">
              <span className="text-[8px] font-mono text-amber-200 bg-black/80 px-1.5 py-0.5 rounded w-max border border-amber-300/30">
                TOP SAFE ZONE (NO UI)
              </span>
              <span className="text-[8px] font-mono text-amber-200 bg-black/80 px-1.5 py-0.5 rounded w-max self-end border border-amber-300/30">
                CAPTION & INTERACTION MARGIN
              </span>
            </div>
          )}

          {/* Top Platform-Specific Header UI */}
          <div className="relative z-10 pt-8 px-4 flex items-center justify-between text-white drop-shadow-md pointer-events-none">
            {channel === 'tiktok' && (
              <>
                <span className="material-symbols-outlined text-[20px] opacity-80">live_tv</span>
                <div className="flex items-center gap-3 text-[13px] font-bold">
                  <span className="opacity-50 font-normal">Mengikuti</span>
                  <span className="border-b-2 border-white pb-0.5">Untuk Anda</span>
                </div>
                <span className="material-symbols-outlined text-[20px] opacity-80">search</span>
              </>
            )}

            {channel === 'reels' && (
              <>
                <div className="flex items-center gap-1.5 text-base font-bold tracking-tight">
                  <span>Reels</span>
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </div>
                <span className="material-symbols-outlined text-[22px] opacity-90">photo_camera</span>
              </>
            )}

            {channel === 'facebook' && (
              <>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="border-b-2 border-white pb-0.5 font-bold">Reels</span>
                  <span className="opacity-60">Live</span>
                </div>
                <span className="material-symbols-outlined text-[20px] opacity-90">more_horiz</span>
              </>
            )}

            {channel === 'threads' && (
              <>
                <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                <span className="text-xs font-semibold">Threads Feed</span>
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
              </>
            )}
          </div>

          {/* Right Platform-Specific Vertical Interaction Bar */}
          <div className="absolute right-2.5 bottom-12 z-20 flex flex-col items-center gap-3.5 text-white drop-shadow-md">
            {/* Profile Avatar */}
            <div className="relative mb-1">
              <div className="size-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-[10px] text-white">
                  OS
                </div>
              </div>
              {channel === 'tiktok' && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-3.5 rounded-full bg-[#FE2C55] flex items-center justify-center text-white text-[9px] font-bold shadow-xs">
                  +
                </div>
              )}
            </div>

            {/* Like Button */}
            <button 
              type="button" 
              onClick={() => setIsLiked(!isLiked)} 
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="size-8 flex items-center justify-center">
                <span className={`material-symbols-outlined text-[24px] transition-transform active:scale-125 ${isLiked ? 'text-[#FE2C55] fill-current font-variation-fill' : 'text-white'}`}>
                  favorite
                </span>
              </div>
              <span className="font-mono text-[9px] font-bold mt-0.5">
                {isLiked ? '14.9K' : '14.8K'}
              </span>
            </button>

            {/* Comments Button */}
            <div className="flex flex-col items-center">
              <div className="size-8 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">chat_bubble</span>
              </div>
              <span className="font-mono text-[9px] font-bold mt-0.5">482</span>
            </div>

            {/* Bookmark / Share Button */}
            <button 
              type="button" 
              onClick={() => setIsSaved(!isSaved)} 
              className="flex flex-col items-center cursor-pointer"
            >
              <div className="size-8 flex items-center justify-center">
                <span className={`material-symbols-outlined text-[24px] ${isSaved ? 'text-amber-400 font-variation-fill' : 'text-white'}`}>
                  bookmark
                </span>
              </div>
              <span className="font-mono text-[9px] font-bold mt-0.5">
                {isSaved ? '1.3K' : '1.2K'}
              </span>
            </button>

            {/* Share Arrow */}
            <div className="flex flex-col items-center">
              <div className="size-8 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">share</span>
              </div>
              <span className="font-mono text-[9px] font-bold mt-0.5">Share</span>
            </div>

            {/* Spinning Vinyl Record (TikTok Music) */}
            {channel === 'tiktok' && (
              <div className="size-8 rounded-full bg-[#181818] border-2 border-neutral-700 flex items-center justify-center mt-1 animate-spin duration-3000">
                <span className="size-3 rounded-full bg-black border border-white/20"></span>
              </div>
            )}
          </div>

          {/* Bottom Left Context & Live Caption */}
          <div className="absolute bottom-7 z-20 px-3.5 pb-2 text-white drop-shadow-md flex flex-col gap-1 max-w-[78%]">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-tight">@autoposter.agency</span>
              <span className="size-1 rounded-full bg-white/70"></span>
              <span className="font-mono text-[9px] text-white/80 bg-white/10 px-1 py-0.2 rounded uppercase">
                {channel}
              </span>
            </div>
            
            <p className="text-[11px] leading-snug line-clamp-3 text-white/95 font-normal">
              {contentText.trim() || 'Caption postingan akan muncul secara real-time di sini...'}
            </p>

            {/* Audio / Music Row */}
            <div className="flex items-center gap-1 text-[9px] text-white/80 font-mono mt-0.5">
              <span className="material-symbols-outlined text-[12px]">music_note</span>
              <span className="truncate">{title.trim() ? `Suara Asli • ${title}` : 'Suara Asli - Auto Poster Studio'}</span>
            </div>
          </div>

          {/* Bottom Video Progress Scrub Bar & Duration Indicator */}
          <div className="relative z-30 px-3 pb-2 pt-1 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent">
            {/* Interactive Scrubber Bar */}
            <div 
              onClick={handleSeek}
              className="relative w-full h-1 bg-white/30 hover:h-2 rounded-full cursor-pointer transition-all flex items-center group"
            >
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
              {/* Scrubber thumb circle */}
              <div 
                className="size-2.5 rounded-full bg-white shadow-md absolute -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Duration & Playback Timestamp Status */}
            <div className="flex items-center justify-between text-[9px] font-mono text-white/70 px-0.5">
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={togglePlayPause} 
                  className="hover:text-white cursor-pointer"
                >
                  {isPlaying ? <Pause size={9} /> : <Play size={9} className="fill-white" />}
                </button>
                <span>{formatTime(currentTime)}</span>
              </div>
              <span>{formatTime(duration || media?.durationSeconds || 15)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

