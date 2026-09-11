import { useEffect, useRef, useState } from 'react'
import { HISTORY_SOURCE_URL, lookupMileage, lookupOwnership } from '../lib/history.ts'
import type { HistoryReport } from '../lib/history.ts'
import { LookupError } from '../lib/govil.ts'
import type { Vehicle } from '../lib/govil.ts'
import { Icon } from './Icon.tsx'

type Remote<T> = { status: 'loading' } | { status: 'ready'; report: HistoryReport<T> } | { status: 'error'; code: string }

function useHistory<T>(plate: string, loader: (plate: string, request: typeof fetch, signal: AbortSignal) => Promise<HistoryReport<T>>) {
  const [state, setState] = useState<Remote<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    async function load() {
      try {
        const report = await loader(plate, fetch, controller.signal)
        if (!controller.signal.aborted) setState({ status: 'ready', report })
      } catch (error) {
        if (controller.signal.aborted) return
        if (!(error instanceof LookupError)) console.error('History lookup failed:', error instanceof Error ? error.name : 'UnknownError')
        setState({ status: 'error', code: error instanceof LookupError ? error.code : 'internal_error' })
      }
    }
    void load()
    return () => controller.abort()
  }, [plate, loader, attempt])
  return { state, retry: () => {
    request.current?.abort()
    setState({ status: 'loading' })
    setAttempt(value => value + 1)
  } }
}

function Unavailable({ code, retry }: { code: string; retry: () => void }) {
  return <div className="history-unavailable" role="alert"><p>{code === 'upstream_timeout' ? 'המאגר לא הגיב בזמן.' : 'לא התקבלה תשובה תקינה מהמאגר.'} המידע בחלק זה לא זמין כרגע; שאר תוצאות הרכב נשארות זמינות.</p><button className="secondary-button" onClick={retry}>ניסיון נוסף</button></div>
}

function Freshness({ report }: { report: HistoryReport<unknown> }) {
  return <p className="lookup-time">נשלף ב־<time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString('he-IL')}</time> · עדכון המקור: {report.dataUpdatedAt ? <bdi>{report.dataUpdatedAt.slice(0, 10)}</bdi> : 'לא נמסר'}. ייתכנו פערי עדכון.</p>
}

function HistoryData({ plate, vehicle }: { plate: string; vehicle: Vehicle | null }) {
  const ownership = useHistory(plate, lookupOwnership)
  const mileage = useHistory(plate, lookupMileage)
  const ownerReport = ownership.state.status === 'ready' ? ownership.state.report : null
  const mileageReport = mileage.state.status === 'ready' ? mileage.state.report : null
  const reading = mileageReport?.items[0]
  const flags = reading ? [
    { label: 'שינוי מבנה', value: reading.structuralChange }, { label: 'הסבה לגפ״מ', value: reading.gasConversion },
    { label: 'שינוי צבע', value: reading.colorChange }, { label: 'שינוי צמיג', value: reading.tyreChange },
  ] : []
  return <>
    <div className="history-registration">
      <div><span>בעלות נוכחית לפי רישום הרכב</span><strong>{vehicle?.currentOwnership ?? 'לא נמסר'}</strong></div>
      <div><span>עלייה לכביש לפי רישום הרכב</span><strong><bdi>{vehicle?.firstRoadDate ?? 'לא נמסר'}</bdi></strong></div>
      <div><span>טסט אחרון לפי רישום הרכב</span><strong><bdi>{vehicle?.lastTestDate?.slice(0, 10) ?? 'לא נמסר'}</bdi></strong></div>
    </div>
    <div className="history-grid">
      <article className="history-card ownership-card" aria-busy={ownership.state.status === 'loading'} aria-live="polite">
        <span className="eyebrow">הדרך שהרכב עבר</span><h3>היסטוריית בעלויות</h3>
        {ownership.state.status === 'loading' ? <p><span className="spinner" /> טוענים רשומות בעלות…</p>
          : ownership.state.status === 'error' ? <Unavailable code={ownership.state.code} retry={ownership.retry} />
            : ownerReport && <>
              <div className="history-metric"><strong>{ownerReport.items.length}{ownerReport.truncated ? '+' : ''}</strong><span>רשומות בעלות במאגר</span></div>
              {ownerReport.truncated && <p className="inline-warning">הרשימה חלקית. אין להסיק ממנה מספר בעלים כולל.</p>}
              {ownerReport.items.length ? <ol className="ownership-timeline">{ownerReport.items.map((entry, index) => <li key={entry.id}><span className="timeline-index" aria-hidden="true">{index + 1}</span><div><strong>{entry.ownership ?? 'סוג בעלות לא נמסר'}</strong><span>מועד בעלות במאגר: {entry.period ? <bdi>{entry.period.slice(5)}/{entry.period.slice(0, 4)}</bdi> : 'לא נמסר'}</span></div></li>)}</ol>
                : <p>לא נמצאו רשומות בעלות במאגר שנבדק. אין בכך אישור שהרכב יד ראשונה.</p>}
              <p className="history-note">מוצגים תאריכים וסוגי בעלות כפי שפורסמו, ללא שמות או פרטי קשר. מספר הרשומות אינו קביעה של מספר ה״יד״ או מספר הבעלים הקודמים.</p>
              <Freshness report={ownerReport} />
            </>}
      </article>
      <article className="history-card mileage-card" aria-busy={mileage.state.status === 'loading'} aria-live="polite">
        <span className="eyebrow">מה רשום במד־האוץ</span><h3>קילומטראז׳ מתועד</h3>
        {mileage.state.status === 'loading' ? <p><span className="spinner" /> טוענים נתוני נסועה…</p>
          : mileage.state.status === 'error' ? <Unavailable code={mileage.state.code} retry={mileage.retry} />
            : mileageReport && <>
              {reading ? <>
                <div className="history-metric"><strong>{reading.kilometers === null ? 'לא נמסר' : reading.kilometers.toLocaleString('he-IL')}</strong><span>{reading.kilometers === null ? 'קריאת מד־אוץ חסרה ברשומה' : 'ק״מ כפי שדווחו בטסט האחרון'}</span></div>
                <p className="history-note">זו קריאה מצטברת, לא נסועה שנתית או הקילומטראז׳ הנוכחי. מקור הנסועה אינו כולל תאריך קריאה; תאריך הטסט למעלה מגיע ממאגר נפרד.</p>
                <dl className="history-details"><div><dt>רישום ראשון במאגר ההיסטוריה</dt><dd><bdi>{reading.firstRegistration ?? 'לא נמסר'}</bdi></dd></div><div><dt>מקוריות הרכב לפי המאגר</dt><dd>{reading.origin ?? 'לא נמסר'}</dd></div>{flags.map(flag => <div key={flag.label}><dt>{flag.label}</dt><dd>{flag.value === null ? 'לא נמסר' : flag.value ? 'רשום שינוי' : 'לא מסומן שינוי'}</dd></div>)}</dl>
                <p className="history-note">סימוני שינוי ברישום אינם כשלעצמם היסטוריית תאונות או אישור לתקינות.</p>
              </> : <p>לא נמצאה רשומת נסועה במאגר שנבדק. אין פירוש הדבר שהרכב נסע 0 ק״מ.</p>}
              <Freshness report={mileageReport} />
            </>}
        <div className="annual-mileage-note"><strong>וקילומטראז׳ בשנים קודמות?</strong><p>המקור הציבורי מציג רק את הקריאה מהטסט האחרון, ולא סדרת קריאות לפי שנה. להשלמת ההיסטוריה בקשו מהמוכר רישומי טסט קודמים או חשבוניות עם קריאת מד־אוץ.</p></div>
      </article>
    </div>
  </>
}

export function HistoryPanel({ plate, vehicle, demo, onPlate }: {
  plate: string | null; vehicle: Vehicle | null; demo: boolean; onPlate: () => void
}) {
  return <section className="history-panel" id="history" aria-labelledby="history-title">
    <div className="section-heading"><div><span className="eyebrow">03 / היסטוריית הרכב</span><h2 id="history-title">הבעלויות. הקילומטרים. הרישום.</h2></div><span className="source-chip">משרד התחבורה</span></div>
    {plate && !demo ? <HistoryData key={plate} plate={plate} vehicle={vehicle} /> : <div className="history-prompt"><Icon name="car" size={30} /><div><h3>{demo ? 'לדוגמה הפיקטיבית אין היסטוריה שנבדקה.' : 'מספר הרישוי פותח גם את היסטוריית הרכב.'}</h3><p>רשומות בעלות ונתוני נסועה זמינים בחיפוש לפי מספר רישוי, ולא מפענוח VIN בלבד.</p><button className="text-button" onClick={onPlate}>בדיקה לפי מספר רישוי <Icon name="arrow" size={16} /></button></div></div>}
    <div className="history-footer"><a href={HISTORY_SOURCE_URL} target="_blank" rel="noreferrer">מאגרי היסטוריית הרכב — מקור הנתונים <Icon name="link" size={13} /></a><p>הכיסוי הוא לרכבים פרטיים פעילים החל מ־2017. מאגר הבעלויות אינו כולל רכבים שהיה להם מספר רישוי קודם. הנתונים בחלק זה אינם נכללים בדוח השיתוף.</p></div>
  </section>
}
