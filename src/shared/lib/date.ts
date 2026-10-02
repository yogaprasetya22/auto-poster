const WIB_OFFSET = 7 * 60 // UTC+7 in minutes

/** Format ISO date to "03 Okt 2026 14:30 WIB" */
export function formatWIB(iso: string): string {
  const d = new Date(iso)
  const wib = new Date(d.getTime() + WIB_OFFSET * 60_000)
  const day = String(wib.getUTCDate()).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const mon = months[wib.getUTCMonth()]
  const year = wib.getUTCFullYear()
  const hh = String(wib.getUTCHours()).padStart(2, '0')
  const mm = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${day} ${mon} ${year} ${hh}:${mm} WIB`
}

/** Format relative time: "5 menit lalu", "2 jam lalu" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  return `${days} hari lalu`
}
