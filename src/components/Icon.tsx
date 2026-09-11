const paths = {
  arrow: 'M19 12H5m6-6-6 6 6 6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  check: 'm5 12 4 4L19 6',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  shield: 'M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3Zm-4 9 3 3 5-6',
  scan: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 12h10',
  car: 'm5 7 2-4h10l2 4M4 7h16l2 4v7H2v-7l2-4Zm-2 6h4m12 0h4M5 18v3m14-3v3',
  link: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
} as const

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
