import { ANALYTICS_EVENTS, analyticsContext, analyticsEventDetail } from './analytics-policy.ts'
import type { AnalyticsDetail, AnalyticsEvent } from './analytics-policy.ts'

type Consent = 'unset' | 'granted' | 'denied'
type LoadState = 'idle' | 'loading' | 'ready' | 'blocked'
type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: IArguments[]
    gtag?: Gtag
    [key: `ga-disable-${string}`]: boolean
  }
}

const storageKey = 'testmatesla-analytics-consent-v1'
const changeEvent = 'testmatesla-analytics-change'
let measurementId = ''
let consent: Consent = 'unset'
let loadState: LoadState = 'idle'
let storageUnavailable = false
let pageViewSent = false
let sharedPage = false
let sharedOpenSent = false
let context: Record<string, string> = {}
let tag: HTMLScriptElement | null = null

export function analyticsState() {
  return { enabled: Boolean(measurementId), consent, loadState, storageUnavailable }
}

export function subscribeAnalytics(listener: () => void) {
  window.addEventListener(changeEvent, listener)
  return () => window.removeEventListener(changeEvent, listener)
}

function notify() {
  window.dispatchEvent(new Event(changeEvent))
}

function readConsent(): Consent {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return 'unset'
    const value: unknown = JSON.parse(raw)
    if (typeof value === 'object' && value !== null && 'choice' in value && 'expiresAt' in value &&
      (value.choice === 'granted' || value.choice === 'denied') &&
      typeof value.expiresAt === 'number' && value.expiresAt > Date.now()) return value.choice
    return 'unset'
  } catch (error) {
    if (!(error instanceof DOMException) && !(error instanceof SyntaxError)) throw error
    storageUnavailable = true
    console.warn('Analytics consent storage is unavailable or invalid.')
    return 'unset'
  }
}

function clearAnalyticsCookies() {
  try {
    for (const name of ['_ga', `_ga_${measurementId.slice(2)}`]) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`
    }
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    storageUnavailable = true
    console.warn('Analytics cookies cannot be accessed in this browser.')
  }
}

export function initializeAnalytics(id: string, isSharedPage = false) {
  if (measurementId || !id) return
  if (!/^G-[A-Z0-9]{6,20}$/.test(id)) {
    console.error('Analytics configuration has an invalid Measurement ID.')
    return
  }
  measurementId = id
  sharedPage = isSharedPage
  context = analyticsContext(window.location.search, document.referrer)
  consent = readConsent()
  if (consent === 'granted') startTag()
  else {
    window[`ga-disable-${measurementId}`] = true
    clearAnalyticsCookies()
  }
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) applyConsent(readConsent())
  })
  notify()
}

function startTag() {
  window[`ga-disable-${measurementId}`] = false
  window.dataLayer ??= []
  window.gtag ??= function (..._args: unknown[]) { window.dataLayer?.push(arguments) }
  const deniedAds = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }
  window.gtag('consent', tag ? 'update' : 'default', { ...deniedAds, analytics_storage: 'granted' })
  window.gtag('set', { ...context, allow_google_signals: false, allow_ad_personalization_signals: false })
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    ...context, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
    cookie_domain: 'none', cookie_path: '/', cookie_expires: 60 * 60 * 24 * 180,
    cookie_flags: 'SameSite=Lax;Secure',
  })
  if (!tag || loadState === 'blocked') {
    tag?.remove()
    loadState = 'loading'
    tag = document.createElement('script')
    tag.async = true
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    tag.referrerPolicy = 'no-referrer'
    tag.onload = () => { loadState = 'ready'; notify() }
    tag.onerror = () => {
      loadState = 'blocked'
      pageViewSent = false
      sharedOpenSent = false
      window.dataLayer?.splice(0)
      console.warn('Analytics could not load; vehicle lookup is unaffected.')
      notify()
    }
    document.head.appendChild(tag)
  }
  if (!pageViewSent) {
    trackEvent('page_view')
    pageViewSent = true
  }
  recordSharedOpen()
}

function recordSharedOpen() {
  if (sharedPage && !sharedOpenSent && consent === 'granted' && loadState !== 'blocked') {
    trackEvent('shared_report_opened')
    sharedOpenSent = true
  }
}

export function setAnalyticsPage(isSharedPage: boolean) {
  if (sharedPage !== isSharedPage) sharedOpenSent = false
  sharedPage = isSharedPage
  recordSharedOpen()
}

function applyConsent(choice: Consent) {
  consent = choice
  if (choice === 'granted') startTag()
  else {
    window[`ga-disable-${measurementId}`] = true
    if (loadState !== 'ready') {
      pageViewSent = false
      sharedOpenSent = false
    }
    window.dataLayer?.splice(0)
    window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    clearAnalyticsCookies()
  }
  notify()
}

export function chooseAnalyticsConsent(choice: 'granted' | 'denied') {
  if (!measurementId) return
  storageUnavailable = false
  try {
    localStorage.setItem(storageKey, JSON.stringify({ choice, expiresAt: Date.now() + 180 * 86_400_000 }))
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    storageUnavailable = true
    console.warn('Analytics consent could not be saved.')
  }
  applyConsent(choice)
}

export function trackEvent(event: AnalyticsEvent, detail: AnalyticsDetail = {}) {
  if (!measurementId || consent !== 'granted' || loadState === 'blocked') return
  if (!ANALYTICS_EVENTS.includes(event)) {
    console.warn('An unsupported analytics event was ignored.')
    return
  }
  if (loadState === 'loading' && (window.dataLayer?.length ?? 0) > 100) {
    console.warn('Analytics pending queue is full; this event was not queued.')
    return
  }
  window.gtag?.('event', event, { ...context, ...analyticsEventDetail(event, detail), send_to: measurementId })
}
