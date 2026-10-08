import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

export interface CarouselSlideItem {
  tag?: string
  title: string
  desc: string
  imageUrl?: string
}

interface PostPhoneSimulatorProps {
  channel?: 'tiktok' | 'reels' | 'threads' | 'facebook'
  mediaUrl: string
  mediaType?: 'VIDEO' | 'IMAGE' | 'CAROUSEL'
  carouselSlides?: CarouselSlideItem[]
  contentText?: string
  title?: string
  accountName?: string
}

export function PostPhoneSimulator({
  channel: initialChannel = 'reels',
  mediaUrl,
  mediaType = 'VIDEO',
  carouselSlides,
  contentText = '',
  title = '',
  accountName = 'autoposter.agency',
}: PostPhoneSimulatorProps) {
  const [channel, setChannel] = useState<'tiktok' | 'reels' | 'threads' | 'facebook'>(initialChannel)
  const [activeSlideIdx, setActiveSlideIdx] = useState(0)
  const [showSafeZone, setShowSafeZone] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && mediaType === 'VIDEO') {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, mediaUrl, mediaType])

  function togglePlayPause() {
    if (!videoRef.current || mediaType !== 'VIDEO') return
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
    <div className="flex flex-col gap-3 min-w-0 w-full max-w-[340px] mx-auto select-none">
      {/* Platform Switcher & Safe Zone Bar */}
      <div className="flex flex-col gap-2 bg-white dark:bg-[#18181B] p-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-black dark:text-white">smartphone</span>
            <span className="text-xs font-semibold text-black dark:text-white">Phone Canvas 9:16</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSafeZone}
              onChange={(e) => setShowSafeZone(e.target.checked)}
              className="accent-black size-3.5 rounded"
            />
            <span className="text-[10px] text-[#6B7280] font-medium">Safe Zone</span>
          </label>
        </div>

        {/* Tab Channel Selector */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#F3F4F6] dark:bg-[#27272A] rounded-lg border border-[#E5E7EB] dark:border-transparent">
          {(['tiktok', 'reels', 'threads', 'facebook'] as const).map((tab) => {
            const active = channel === tab
            const labelMap = { tiktok: 'TikTok', reels: 'Reels', threads: 'Threads', facebook: 'FB' }
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setChannel(tab)}
                className={`py-1 rounded text-[11px] transition-all font-medium cursor-pointer ${
                  active
                    ? 'text-white bg-black dark:bg-[#121212] font-semibold shadow-xs'
                    : 'text-[#6B7280] hover:text-black dark:hover:text-white'
                }`}
              >
                {labelMap[tab]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hardware Frame (iPhone 16 Pro Style) */}
      <div className="relative w-full bg-[#0A0A0A] rounded-[2.5rem] p-2.5 shadow-2xl flex flex-col aspect-[9/18] overflow-hidden border-[4px] border-[#262626] ring-1 ring-black">
        <div className="relative w-full h-full bg-black rounded-[2rem] overflow-hidden flex flex-col justify-between">
          
          {/* Top Status Bar & Dynamic Island */}
          <div className="absolute top-0 inset-x-0 h-7 px-4 flex items-center justify-between z-30 text-[9px] text-white font-medium pointer-events-none">
            <span className="tracking-tight">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="w-[74px] h-[18px] bg-black rounded-full flex items-center justify-end px-2 border border-white/10 shadow-inner">
              <span className="size-1.5 rounded-full bg-[#1C1C1E]"></span>
            </div>
            <div className="flex items-center">
              <span className="font-mono text-[10px] font-bold tracking-wider text-white/90">5G</span>
            </div>
          </div>

          {/* Video / Image Canvas */}
          <div
            onClick={togglePlayPause}
            className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-neutral-950 flex items-center justify-center cursor-pointer group"
          >
            {mediaType === 'CAROUSEL' && carouselSlides && carouselSlides.length > 0 ? (
              <div
                className="w-full h-full relative overflow-hidden flex flex-col justify-between p-5 text-white bg-gradient-to-b from-neutral-900 via-neutral-950 to-black select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Background Image / Pattern if available */}
                {mediaUrl && (
                  <img
                    src={carouselSlides[activeSlideIdx]?.imageUrl || mediaUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px] pointer-events-none"
                  />
                )}

                {/* Top Slide Badge & Pagination Dots */}
                <div className="relative z-10 pt-7 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[9px] font-mono tracking-wider border border-white/20">
                    {carouselSlides[activeSlideIdx]?.tag || `SLIDE ${activeSlideIdx + 1}/${carouselSlides.length}`}
                  </span>
                  <div className="flex items-center gap-1">
                    {carouselSlides.map((_, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setActiveSlideIdx(sIdx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          activeSlideIdx === sIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Middle Content: Card Slide */}
                <div className="relative z-10 my-auto p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 space-y-2 shadow-2xl">
                  <h3 className="font-bold text-sm sm:text-base leading-snug drop-shadow-sm">
                    {carouselSlides[activeSlideIdx]?.title}
                  </h3>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {carouselSlides[activeSlideIdx]?.desc}
                  </p>
                </div>

                {/* Bottom Navigation Chevrons */}
                <div className="relative z-10 pb-12 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveSlideIdx((prev) => Math.max(0, prev - 1))}
                    disabled={activeSlideIdx === 0}
                    className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/20 text-white text-[10px] font-mono disabled:opacity-30 cursor-pointer"
                  >
                    ← Geser Kiri
                  </button>
                  <span className="text-[10px] font-mono opacity-60">
                    {activeSlideIdx + 1} dari {carouselSlides.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSlideIdx((prev) => Math.min(carouselSlides.length - 1, prev + 1))}
                    disabled={activeSlideIdx === carouselSlides.length - 1}
                    className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/20 text-white text-[10px] font-mono disabled:opacity-30 cursor-pointer"
                  >
                    Geser Kanan →
                  </button>
                </div>
              </div>
            ) : mediaUrl ? (
              mediaType === 'IMAGE' ? (
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black">
                  <img
                    src={mediaUrl}
                    alt={title || 'Media Visual'}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-9 left-3 z-10 px-2 py-0.5 rounded bg-black/70 border border-white/20 text-white font-mono text-[9px]">
                    POSTER ASSET
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    loop
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
                      <div className="size-12 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white shadow-2xl">
                        <Play size={20} className="ml-0.5 fill-white" />
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/40 p-4 text-center">
                <span className="material-symbols-outlined text-3xl mb-1">movie</span>
                <p className="text-[10px] font-mono">Tidak ada media</p>
              </div>
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          </div>

          {/* Safe Zone Boundary */}
          {showSafeZone && (
            <div className="absolute inset-x-2.5 top-9 bottom-12 border border-dashed border-amber-300/70 rounded-2xl pointer-events-none z-20 flex flex-col justify-between p-2">
              <span className="text-[8px] font-mono text-amber-200 bg-black/80 px-1 py-0.5 rounded w-max border border-amber-300/30">
                TOP SAFE ZONE
              </span>
              <span className="text-[8px] font-mono text-amber-200 bg-black/80 px-1 py-0.5 rounded w-max self-end border border-amber-300/30">
                UI & CAPTION ZONE
              </span>
            </div>
          )}

          {/* Platform Top Header */}
          <div className="relative z-10 pt-7 px-3.5 flex items-center justify-between text-white drop-shadow-md pointer-events-none">
            {channel === 'tiktok' && (
              <>
                <span className="material-symbols-outlined text-[18px] opacity-80">live_tv</span>
                <div className="flex items-center gap-2.5 text-[12px] font-bold">
                  <span className="opacity-50 font-normal">Mengikuti</span>
                  <span className="border-b-2 border-white pb-0.5">Untuk Anda</span>
                </div>
                <span className="material-symbols-outlined text-[18px] opacity-80">search</span>
              </>
            )}

            {channel === 'reels' && (
              <>
                <div className="flex items-center gap-1 text-sm font-bold tracking-tight">
                  <span>Reels</span>
                  <span className="material-symbols-outlined text-[15px]">expand_more</span>
                </div>
                <span className="material-symbols-outlined text-[20px] opacity-90">photo_camera</span>
              </>
            )}

            {channel === 'facebook' && (
              <>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="border-b-2 border-white pb-0.5 font-bold">Reels</span>
                  <span className="opacity-60">Live</span>
                </div>
                <span className="material-symbols-outlined text-[18px] opacity-90">more_horiz</span>
              </>
            )}

            {channel === 'threads' && (
              <>
                <span className="material-symbols-outlined text-[16px]">alternate_email</span>
                <span className="text-xs font-semibold">Threads</span>
                <span className="material-symbols-outlined text-[16px]">more_horiz</span>
              </>
            )}
          </div>

          {/* Platform Right Actions */}
          <div className="absolute right-2 bottom-11 z-20 flex flex-col items-center gap-3 text-white drop-shadow-md">
            <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-[9px] text-white uppercase">
                {accountName.slice(0, 2)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              className="flex flex-col items-center cursor-pointer"
            >
              <div className="size-7 flex items-center justify-center">
                <span className={`material-symbols-outlined text-[20px] ${isLiked ? 'text-[#FE2C55]' : 'text-white'}`}>
                  favorite
                </span>
              </div>
              <span className="font-mono text-[8px] font-bold mt-0.5">
                {isLiked ? '12.4K' : '12.3K'}
              </span>
            </button>

            <div className="flex flex-col items-center">
              <div className="size-7 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
              </div>
              <span className="font-mono text-[8px] font-bold mt-0.5">384</span>
            </div>

            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              className="flex flex-col items-center cursor-pointer"
            >
              <div className="size-7 flex items-center justify-center">
                <span className={`material-symbols-outlined text-[20px] ${isSaved ? 'text-amber-400' : 'text-white'}`}>
                  bookmark
                </span>
              </div>
              <span className="font-mono text-[8px] font-bold mt-0.5">
                {isSaved ? '920' : '919'}
              </span>
            </button>

            <div className="flex flex-col items-center">
              <div className="size-7 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </div>
              <span className="font-mono text-[8px] font-bold mt-0.5">Share</span>
            </div>
          </div>

          {/* Caption & Account Info */}
          <div className="absolute bottom-6 z-20 px-3 pb-1.5 text-white drop-shadow-md flex flex-col gap-1 max-w-[78%]">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] tracking-tight">@{accountName}</span>
              <span className="size-1 rounded-full bg-white/70" />
              <span className="font-mono text-[8px] text-white/80 bg-white/10 px-1 py-0.2 rounded uppercase">
                {channel}
              </span>
            </div>

            <p className="text-[10px] leading-snug line-clamp-3 text-white/95 font-normal">
              {contentText.trim() || '— Tidak ada naskah caption —'}
            </p>

            <div className="flex items-center gap-1 text-[8px] text-white/80 font-mono mt-0.5">
              <span className="material-symbols-outlined text-[11px]">music_note</span>
              <span className="truncate">{title.trim() ? `Audio • ${title}` : 'Audio Asli'}</span>
            </div>
          </div>

          {/* Scrubber & Duration */}
          {mediaType === 'VIDEO' && (
            <div className="relative z-30 px-2.5 pb-1.5 pt-1 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 to-transparent">
              <div
                onClick={handleSeek}
                className="relative w-full h-1 bg-white/30 hover:h-1.5 rounded-full cursor-pointer transition-all flex items-center"
              >
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[8px] font-mono text-white/70 px-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="hover:text-white cursor-pointer"
                  >
                    {isPlaying ? <Pause size={8} /> : <Play size={8} className="fill-white" />}
                  </button>
                  <span>{formatTime(currentTime)}</span>
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
