import { useEffect, useRef, useState } from 'react'
import { assess, InputError, normalizePlate, normalizeVin, registrationEvidence, RESEARCH_DATE, SOURCES } from './lib/checker.ts'
import type { Replacement, Variant } from './lib/checker.ts'
import { batteryPresentation } from './lib/battery-presentation.ts'
import type { BatteryEvidence } from './lib/battery-presentation.ts'
import { lookupPlate, LookupError } from './lib/govil.ts'
import type { Vehicle } from './lib/govil.ts'
import { lookupRecalls } from './lib/recalls.ts'
import { readInitialReport } from './lib/share.ts'
import { Icon } from './components/Icon.tsx'
import { Brand } from './components/Brand.tsx'
import { SLOGAN } from './lib/branding.ts'
import { BatteryResult } from './components/BatteryResult.tsx'
import { BatteryExplainer } from './components/BatteryExplainer.tsx'
import { RecallPanel } from './components/RecallPanel.tsx'
import type { RecallState } from './components/RecallPanel.tsx'
import { ShareReport } from './components/ShareReport.tsx'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { AnalyticsConsent } from './components/AnalyticsConsent.tsx'
import { initializeAnalytics, setAnalyticsPage, trackEvent } from './lib/analytics.ts'
import './App.css'

const errors: Record<string, string> = {
  invalid_vin: 'בדקו את מספר השלדה: נדרשים 17 תווים, ללא האותיות I, O או Q.',
  invalid_plate: 'הזינו מספר רישוי ישראלי בן 5–8 ספרות. אפשר גם עם רווחים או מקפים.',
  plate_not_found: 'הרכב לא נמצא במאגר הרכבים הפעילים. אפשר לבדוק לפי VIN שמופיע ברישיון או ברכב.',
  vin_unavailable: 'נמצאה רשומת רכב, אך מספר השלדה חסר או לא תקין. הזינו VIN ישירות.',
  upstream_timeout: 'מאגר משרד התחבורה לא הגיב בזמן. נסו שוב, או הזינו VIN לבדיקה מקומית.',
  upstream_unavailable: 'מאגר משרד התחבורה אינו זמין כרגע. אפשר לנסות שוב או לעבור לבדיקה לפי VIN.',
  upstream_invalid: 'התקבלה רשומה שלא ניתן לפענח באופן אמין. נסו להזין את ה-VIN מהרכב.',
  internal_error: 'לא הצלחנו להשלים את הבדיקה. נסו שוב.',
}
type Lookup = { vin: string; plate: string | null; demo: boolean; vehicle: Vehicle | null; source: 'vin' | 'plate' | 'shared' }
const factoryNames: Record<string, string> = { Berlin: 'ברלין, גרמניה', Shanghai: 'שנגחאי, סין', Fremont: 'פרימונט, ארה״ב', Austin: 'אוסטין, ארה״ב' }
const examples = [
  { name: 'תואם לקבוצה', vin: 'XP7YGCFR0PB000001', tone: 'attention' },
  { name: 'מחוץ לקבוצה', vin: 'LRWYGCFR0PC000001', tone: 'clear' },
  { name: 'מידע חלקי', vin: 'XP7YGCFZ0PB000001', tone: 'uncertain' },
]

export default function App() {
  const [initial] = useState(() => readInitialReport(window.location.hash))
  const [shared, setShared] = useState(initial.report)
  const [invalidShare, setInvalidShare] = useState(initial.invalid)
  const [mode, setMode] = useState<'vin' | 'plate'>('plate')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<Lookup | null>(() => initial.report
    ? { vin: initial.report.prefix + '000000', plate: null, demo: false, vehicle: null, source: 'shared' } : null)
  const [variant, setVariant] = useState<Variant>(initial.report?.variant ?? 'unknown')
  const [replacement, setReplacement] = useState<Replacement>(initial.report?.replacement ?? 'unknown')
  const [batteryEvidence, setBatteryEvidence] = useState<BatteryEvidence>(initial.report?.batteryEvidence ?? 'unknown')
  const [recalls, setRecalls] = useState<RecallState>({ status: 'idle' })
  const request = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resultRef = useRef<HTMLElement | null>(null)
  const registration = lookup?.vehicle ? registrationEvidence(lookup.vehicle.year, lookup.vehicle.trim) : shared?.registration ?? null
  const result = lookup ? assess(lookup.vin, variant, replacement, registration) : null
  const batteryUpdate = result ? batteryPresentation(result, replacement, batteryEvidence) : null

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    const live = import.meta.env.PROD && ['testmatesla.com', 'www.testmatesla.com'].includes(window.location.hostname)
    initializeAnalytics(live ? import.meta.env.VITE_GA_MEASUREMENT_ID ?? '' : '', Boolean(shared))
    setAnalyticsPage(Boolean(shared))
  }, [shared])
  useEffect(() => {
    function openSharedLink() {
      if (!window.location.hash.startsWith('#report=')) return
      const next = readInitialReport(window.location.hash)
      request.current?.abort()
      request.current = null
      setBusy(false)
      setError(null)
      setInput('')
      setShared(next.report)
      setInvalidShare(next.invalid)
      setLookup(next.report ? { vin: next.report.prefix + '000000', plate: null, demo: false, vehicle: null, source: 'shared' } : null)
      setVariant(next.report?.variant ?? 'unknown')
      setReplacement(next.report?.replacement ?? 'unknown')
      setBatteryEvidence(next.report?.batteryEvidence ?? 'unknown')
      setRecalls({ status: 'idle' })
    }
    window.addEventListener('hashchange', openSharedLink)
    return () => window.removeEventListener('hashchange', openSharedLink)
  }, [])

  function reset() {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setError(null)
    setLookup(null)
    setShared(null)
    setInvalidShare(false)
    setVariant('unknown')
    setReplacement('unknown')
    setBatteryEvidence('unknown')
    setRecalls({ status: 'idle' })
    if (window.location.hash.startsWith('#report=')) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  function chooseMode(value: 'vin' | 'plate') {
    reset()
    setMode(value)
    setInput('')
    inputRef.current?.focus()
  }

  function changeReplacement(value: Replacement) {
    setReplacement(value)
    if (value !== 'yes' && batteryEvidence.startsWith('replacement-')) setBatteryEvidence('unknown')
  }

  function changeBatteryEvidence(value: BatteryEvidence) {
    setBatteryEvidence(value)
    if (value.startsWith('replacement-')) setReplacement('yes')
  }

  async function refreshRecalls(plate: string, controller: AbortController) {
    setRecalls({ status: 'loading' })
    try {
      const report = await lookupRecalls(plate, fetch, controller.signal)
      if (request.current === controller && !controller.signal.aborted) setRecalls({ status: 'ready', report })
    } catch (err) {
      if (request.current !== controller || controller.signal.aborted) return
      if (!(err instanceof LookupError)) console.error('Recall lookup failed:', err instanceof Error ? err.name : 'UnknownError')
      setRecalls({ status: 'error', code: err instanceof LookupError ? err.code : 'internal_error' })
    }
  }

  function retryRecalls() {
    if (!lookup?.plate) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    void refreshRecalls(lookup.plate, controller)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    trackEvent('vehicle_lookup_started', { lookup_method: mode })
    reset()
    const controller = new AbortController()
    request.current = controller
    try {
      const value = mode === 'vin' ? normalizeVin(input) : normalizePlate(input)
      setBusy(true)
      if (mode === 'vin') {
        setLookup({ vin: value, plate: null, demo: false, vehicle: null, source: 'vin' })
      } else {
        const vehicle = await lookupPlate(value, fetch, controller.signal)
        if (controller.signal.aborted) return
        setLookup({ vin: vehicle.vin, plate: value, demo: false, vehicle, source: 'plate' })
        // Recall outages must never remove an already available battery assessment.
        void refreshRecalls(value, controller)
      }
      trackEvent('vehicle_lookup_completed', { lookup_method: mode })
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch (err) {
      if (controller.signal.aborted) return
      trackEvent('vehicle_lookup_failed', { lookup_method: mode })
      if (err instanceof InputError || err instanceof LookupError) setError(err.code)
      else {
        console.error('Vehicle lookup failed:', err instanceof Error ? err.name : 'UnknownError')
        setError('internal_error')
      }
    } finally {
      if (request.current === controller) setBusy(false)
    }
  }

  function example(vin: string) {
    reset()
    setMode('vin')
    setInput(vin)
    setLookup({ vin, plate: null, demo: true, vehicle: null, source: 'vin' })
  }

  return <div className="site-shell">
    <a className="skip-link" href="#checker">מעבר לבדיקת הרכב</a>
    <header className="site-header">
      <Brand />
      <nav aria-label="ניווט ראשי"><a href="#checker">בדיקת רכב</a><a href="#battery-story">הסיפור של הסוללה</a><a href="#recalls">ריקולים</a><a href="#history">היסטוריה</a><a href="#sources">מקורות</a></nav>
      <span className="header-caption">{SLOGAN}</span>
    </header>
    <main>
      {invalidShare && <div className="error-message" role="alert">הקישור לדוח אינו תקין. אפשר להתחיל בדיקה חדשה לפי מספר רישוי או VIN.</div>}
      {shared && <aside className="shared-banner"><Icon name="link" size={23} /><div><strong>מישהו שיתף איתכם את דוח הטסלה שלו.</strong><p>סיכום שנוצר ב־{new Date(shared.createdAt).toLocaleDateString('he-IL')}. זהו דוח משתמש, לא בדיקה חיה או אימות מטעם טסלה.</p></div><button className="primary-button" onClick={() => chooseMode('plate')}>בדקו גם את הרכב שלכם <Icon name="arrow" size={16} /></button></aside>}
      {!shared && <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><span className="tiny-line" />לנהגים. לקונים. לטסלה שלכם.</span><h1>כל המידע על הטסלה<br /><span>לפי מספר רישוי</span></h1><p>מזינים מספר רכב, מזהים את מאפייני הסוללה ובודקים ריקולים. לפני הקנייה — ולאורך הדרך.</p><a href="#checker" className="hero-link">מתחילים בבדיקה <Icon name="arrow" size={18} /></a><div className="hero-trust"><span><Icon name="shield" size={14} />ללא הרשמה</span><span>ללא שמירת מזהי הרכב</span><span>מקורות גלויים</span></div></div>
        <div className="hero-visual" aria-hidden="true"><div className="visual-top"><span>MODEL Y / BATTERY PROFILE</span><Icon name="scan" size={21} /></div><div className="car-illustration"><svg viewBox="0 0 520 230" fill="none"><ellipse cx="259" cy="193" rx="214" ry="15" fill="#000" opacity=".27" /><path d="M39 158c2-23 19-41 55-49l76-49c35-19 105-20 148-2l73 43 68 15c20 5 33 19 36 42l-6 20h-30c-3-27-17-43-41-43s-42 20-43 43H164c-3-26-20-43-43-43-24 0-40 18-44 43H46l-7-20Z" fill="url(#body)" stroke="#66717d" strokeWidth="1.5" /><path d="m133 102 48-34c30-14 92-15 126-1l55 34H133Z" fill="#1d2632" stroke="#86909d" /><path d="m254 59 1 44m17 7v56m-94-54-3 54m106-47h18" stroke="#7f8792" strokeWidth="1.4" /><path d="m426 116 43 11m-415 9 25-6" stroke="#f4b5bb" strokeWidth="5" strokeLinecap="round" /><circle cx="121" cy="179" r="29" fill="#111720" stroke="#697382" strokeWidth="5" /><circle cx="121" cy="179" r="17" fill="#697382" /><circle cx="418" cy="179" r="29" fill="#111720" stroke="#697382" strokeWidth="5" /><circle cx="418" cy="179" r="17" fill="#697382" /><path d="M178 187h173" stroke="#ed4e62" strokeWidth="7" strokeLinecap="round" /><defs><linearGradient id="body" x1="240" y1="55" x2="240" y2="180" gradientUnits="userSpaceOnUse"><stop stopColor="#c6cbd3" /><stop offset=".45" stopColor="#9aa3b0" /><stop offset="1" stopColor="#454f5e" /></linearGradient></defs></svg></div><div className="visual-bottom"><span className="visual-caption">כעת במיקוד</span><strong>מארז BYD במודל Y</strong><span>ברלין · הנעה אחורית · 2023–2024</span></div><span className="illustration-note">המחשה של קבוצת הדגם, לא תוצאת בדיקה</span></div>
      </section>}

      <section className={`workspace ${shared ? 'shared-workspace' : ''}`} id="checker" aria-label="בדיקת הרכב">
        <div className="input-card">
          <div className="card-heading"><span className="mini-icon"><Icon name="search" /></span><span className="section-index">מתחילים כאן</span></div>
          <h2>איזו טסלה בודקים?</h2><p className="card-subtitle">הרכב שלכם, או זה שסימנתם לקנייה.</p>
          <div className="input-tabs" role="group" aria-label="שיטת בדיקה"><button aria-pressed={mode === 'plate'} onClick={() => chooseMode('plate')}><span className="il-tag" dir="ltr">IL</span>מספר רישוי</button><button aria-pressed={mode === 'vin'} onClick={() => chooseMode('vin')}>מספר שלדה (VIN)</button></div>
          <form onSubmit={submit} noValidate>
            <label htmlFor="identifier">{mode === 'plate' ? 'מספר הרישוי הישראלי' : 'מספר השלדה של הרכב'}</label>
            <div className={`identifier-wrap ${mode === 'plate' ? 'plate-mode' : ''}`}>{mode === 'plate' && <span className="plate-country" aria-hidden="true">IL</span>}<input ref={inputRef} id="identifier" dir="ltr" value={input} onChange={(event) => { reset(); setInput(event.target.value) }} inputMode={mode === 'plate' ? 'numeric' : 'text'} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={mode === 'plate' ? 15 : 30} placeholder={mode === 'plate' ? '123-45-678' : '17 תווים של ה-VIN'} aria-invalid={Boolean(error)} aria-describedby="input-help lookup-error" /></div>
            <p className="field-help" id="input-help">{mode === 'plate' ? 'נשלוף את פרטי הרכב ונבדוק ריקולים במאגרים הרשמיים.' : 'מופיע ברישיון הרכב ובמסך טסלה: פקדים ← תוכנה.'}</p>
            <div id="lookup-error" role="alert">{error && <p className="error-message">{errors[error] ?? errors.internal_error}</p>}</div>
            <button type="submit" className="primary-button lookup-button" disabled={busy || !input.trim()}>{busy ? <><span className="spinner" />מזהים את הרכב…</> : <>בדקו את הטסלה <Icon name="arrow" size={18} /></>}</button>
          </form>
          <details className="examples"><summary>רק רוצים לראות איך זה עובד?</summary><div>{examples.map((item) => <button key={item.vin} onClick={() => example(item.vin)}><span className="sample-dot" data-tone={item.tone} />{item.name}</button>)}</div><p>דוגמאות פיקטיביות, ללא פנייה למאגר הרכבים.</p></details>
          <div className="input-privacy"><Icon name="shield" size={17} /><p>האתר לא שומר מספרי רכב. בדיקת VIN מקומית; חיפוש רישוי נשלח ישירות למשרד התחבורה.</p></div>
        </div>
        <section className="assessment-area" tabIndex={-1} ref={resultRef} aria-label="תוצאת בדיקת הרכב" aria-live="polite" aria-busy={busy}>
          {result && lookup ? <>
            <div className="vehicle-strip"><div><span className="eyebrow">{lookup.demo ? 'דוגמה פיקטיבית' : lookup.source === 'shared' ? 'סיכום ששיתף משתמש' : lookup.source === 'plate' ? 'זוהה לפי מאגר משרד התחבורה' : 'פרטים מפענוח VIN'}</span><h2><bdi>{result.decoded.model ?? lookup.vehicle?.model ?? 'פרטי הרכב'}</bdi><span>{result.profileYear ?? ''}</span></h2></div><Icon name="car" size={38} /></div>
            <p className="vehicle-year-source">{registration?.year != null ? <>{lookup.source === 'shared' ? 'שנת ייצור ברישום הישראלי לפי הנתונים ששותפו' : 'שנת ייצור ברישום הישראלי'}: {registration.year}</> : <>שנה לפי VIN: {result.decoded.year ?? 'לא זוהתה'}</>}{lookup.vehicle?.firstRoadDate && <> · עלייה לכביש במאגר: <bdi>{lookup.vehicle.firstRoadDate}</bdi></>}</p>
            <div className="vehicle-facts"><div><span>מפעל</span><strong>{factoryNames[result.decoded.factory ?? ''] ?? 'לא זוהה'}</strong></div><div><span>{registration?.drive && registration.drive !== 'unknown' ? lookup.source === 'shared' ? 'הנעה בנתונים ששותפו' : 'הנעה לפי הרישום' : 'הנעה'}</span><strong>{result.profileDrive === 'rwd' ? 'אחורית' : result.profileDrive === 'awd' ? 'כפולה' : 'נדרש מידע נוסף'}</strong></div><div><span>זהות הסוללה</span><strong>{batteryUpdate?.updated ? batteryUpdate.title : result.status === 'conflicting' ? 'פרטים סותרים — נדרש בירור' : result.status === 'document-supported' ? 'BYD לפי הקוד שהוזן' : 'נדרש מסמך זיהוי'}</strong></div></div>
            <BatteryResult key={`${lookup.vin}-${lookup.source}`} result={result} plate={lookup.plate} demo={lookup.demo} variant={variant} replacement={replacement} batteryEvidence={batteryEvidence} setVariant={setVariant} setReplacement={changeReplacement} setBatteryEvidence={changeBatteryEvidence} readOnly={lookup.source === 'shared'} />
            {lookup.vehicle && <details className="registration-details"><summary>פרטי הרישום</summary><p>יצרן במאגר: {lookup.vehicle.make ?? 'לא צוין'} · קוד דגם: {lookup.vehicle.modelCode ?? 'לא צוין'} · הוראת רישום: {lookup.vehicle.directive ?? 'לא צוינה'}</p><p>מספרים אלה מוצגים לזיהוי הרשומה; הם אינם מיפוי מאומת לספק סוללה.</p></details>}
          </> : <div className="empty-assessment"><div className="empty-topline"><span className="eyebrow">ממספר רכב לתמונה ברורה</span><Icon name="scan" size={26} /></div><h2>לא עוד ניחוש<br />לפי שנת הדגם.</h2><p>משווים ארבעה מאפיינים לקבוצת הדגם שבמוקד דיווחי הסוללה, ומראים מה תואם ומה שונה.</p><div className="preview-criteria"><span>דגם</span><span>מפעל</span><span>שנת ייצור</span><span>הנעה</span></div><div className="result-legend"><span><i data-tone="attention" />תואם לקבוצה</span><span><i data-tone="clear" />מחוץ לקבוצה</span><span><i data-tone="uncertain" />נדרש בירור</span></div><a href="#battery-story" className="text-link">מהי קבוצת הדגם שנבדקת? <Icon name="arrow" size={15} /></a></div>}
        </section>
      </section>

      {shared && <div className="shared-recall-note"><Icon name="info" size={20} /><div><strong>ריקולים בסיכום ששיתף המשתמש</strong><p>{shared.recall ? `${shared.recall.count}${shared.recall.truncated ? '+' : ''} קריאות במאגר לפי הדוח שנוצר. מועד השאילתה שצוין: ${new Date(shared.recall.checkedAt).toLocaleString('he-IL')}.` : 'לא נכללה בדיקת ריקולים בסיכום.'} זהו מידע מתוך הקישור ולא תוצאה שנשלפה כעת. התחילו בדיקה לפי מספר רישוי לקבלת מידע עדכני.</p></div></div>}
      <RecallPanel state={recalls} hasPlate={Boolean(lookup?.plate)} demo={Boolean(lookup?.demo)} onRetry={retryRecalls} onPlate={() => chooseMode('plate')} />
      <HistoryPanel plate={lookup?.plate ?? null} vehicle={lookup?.vehicle ?? null} demo={Boolean(lookup?.demo)} onPlate={() => chooseMode('plate')} />
      {result && lookup && !lookup.demo && lookup.source !== 'shared' && <ShareReport key={`${lookup.vin}:${variant}:${replacement}:${batteryEvidence}:${recalls.status}:${recalls.status === 'ready' ? recalls.report.checkedAt : ''}`} assessment={result} variant={variant} replacement={replacement} batteryEvidence={batteryEvidence} recalls={recalls} />}
      <BatteryExplainer />
      <section className="sources-section" id="sources"><div><span className="eyebrow">מאחורי כל מסקנה יש מקור</span><h2>אפשר לבדוק גם אותנו.</h2><p>תיעוד טסלה, מאגרי מידע רשמיים ודיווחים מקומיים — עם הבחנה בין עובדה, דיווח והשערה.</p><span className="research-date">בסיס המחקר עודכן: <time dateTime={RESEARCH_DATE}>{new Date(`${RESEARCH_DATE}T12:00:00`).toLocaleDateString('he-IL')}</time></span></div><div className="sources-list">{SOURCES.map((source, index) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span className="source-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{source.title.he}</strong><small>{source.kind.he}</small></span><Icon name="link" size={16} /></a>)}</div></section>
      <details className="method-notes"><summary>איך הבדיקה עובדת, ומה משותף בדוח?</summary><p>המדד סופר ארבעה מאפייני רכב ביחס לקבוצה שנחקרה. הוא אינו מודל הסתברותי, אבחון או אימות מקוריות VIN. החלפת סוללה אינה משנה VIN; מידע על הסוללה המותקנת דורש מסמכי שירות. פרטים מתעודת CoC מוזנים על ידי המשתמש.</p><p>דוח משותף כולל קידומת VIN של 11 תווים, שמזהה מאפייני קבוצה ולא את המספר הסידורי, פרטים שהמשתמש ציין וסיכום ריקולים אם הושלם. הוא אינו חתום או מאומת: נמען יכול לראות סיכום אך צריך לבצע בדיקה עדכנית משלו.</p><p>מספרי רישוי נשלחים ישירות ל־data.gov.il, שמקבל גם את כתובת ה-IP. האתר אינו שומר מזהי רכב או משתמש בכלי אנליטיקה. ברירת המחדל היא מאגר רכבים פעילים; מידע חדש או רכב לא פעיל עשויים להיות חסרים.</p></details>
    </main>
    <AnalyticsConsent />
    <footer><Brand footer /><p>{SLOGAN}</p><span>פרויקט עצמאי, ללא שיוך לטסלה או ל־BYD.</span></footer>
  </div>
}
