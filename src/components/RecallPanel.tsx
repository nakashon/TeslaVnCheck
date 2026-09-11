import type { RecallReport } from '../lib/recalls.ts'
import { RECALL_SOURCE_URL } from '../lib/recalls.ts'
import { Icon } from './Icon.tsx'

export type RecallState = { status: 'idle' | 'loading' } | { status: 'ready'; report: RecallReport } | { status: 'error'; code: string }

export function RecallPanel({ state, hasPlate, demo, onRetry, onPlate }: {
  state: RecallState
  hasPlate: boolean
  demo: boolean
  onRetry: () => void
  onPlate: () => void
}) {
  const report = state.status === 'ready' ? state.report : null
  const hasItems = Boolean(report?.items.length)
  const tone = state.status === 'error' || report?.truncated ? 'uncertain' : report ? hasItems ? 'attention' : 'clear' : 'neutral'
  return <section className="recall-panel" data-tone={tone} id="recalls" aria-labelledby="recalls-title" aria-live="polite" aria-busy={state.status === 'loading'}>
    <div className="recall-heading"><span className="recall-icon"><Icon name="shield" size={23} /></span><div><span className="section-index">02 / קריאות חוזרות</span><h2 id="recalls-title">ריקולים בישראל</h2></div><span className="source-chip">משרד התחבורה</span></div>
    {demo ? <div className="recall-empty"><h3>הנתונים כאן הם דוגמה בלבד.</h3><p>לא בוצעה בדיקת ריקולים לדוגמה. הזינו מספר רישוי לבדיקה במאגר הממשלתי.</p><button className="text-button" onClick={onPlate}>בדיקת רכב לפי מספר רישוי <Icon name="arrow" size={16} /></button></div>
      : state.status === 'loading' ? <div className="recall-empty"><h3><span className="spinner" /> בודקים קריאות פתוחות לרכב…</h3><p>בדיקת הריקולים מתבצעת בנפרד מתוצאת הסוללה.</p></div>
        : state.status === 'error' ? <div className="recall-empty"><h3>בדיקת הריקולים לא הושלמה.</h3><p>{state.code === 'upstream_timeout' ? 'מאגר משרד התחבורה לא הגיב בזמן.' : 'לא התקבלה תשובה תקינה ממאגר משרד התחבורה.'} תוצאת הסוללה נשארת זמינה.</p><button className="secondary-button" onClick={onRetry}>ניסיון נוסף</button></div>
          : report ? <>
            <div className="recall-result"><strong>{report.truncated ? `${report.items.length}+` : report.items.length}</strong><div><h3>{hasItems ? 'קריאות חוזרות שנמצאו לרכב' : report.truncated ? 'הבדיקה חלקית — אין מסקנה סופית' : 'לא נמצאו ריקולים פתוחים במאגר שנבדק'}</h3><p>{hasItems ? 'בדקו מול טסלה אם התיקון נדרש לרכב ומהו מועד הטיפול.' : 'זו תוצאת החיפוש במאגר הישראלי, ולא בדיקת תקינות הסוללה.'}</p></div></div>
            {report.truncated && <p className="inline-warning">התקבלו נתונים חלקיים. השלימו את הבירור מול משרד התחבורה או טסלה.</p>}
            {report.items.length > 0 && <div className="recall-items">{report.items.map((item) => <article key={item.id}><div><h4>{item.description ?? 'קריאה חוזרת — יש לברר את פרטי הטיפול מול טסלה'}</h4><span className="recall-id">מספר קריאה: <bdi>{item.id}</bdi></span></div>{item.faultType && <p>סוג התקלה: {item.faultType}</p>}{item.openedAt && <p>מועד פתיחה במאגר: <bdi>{item.openedAt}</bdi></p>}</article>)}</div>}
            <p className="lookup-time">נבדק ב־<time dateTime={report.checkedAt}>{new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.checkedAt))}</time> · {report.dataUpdatedAt ? <>תאריך עדכון המקור: <time dateTime={report.dataUpdatedAt}><bdi>{report.dataUpdatedAt.slice(0, 10)}</bdi></time>.</> : 'מועד עדכון המקור לא נמסר.'} ייתכנו פערי עדכון.</p>
          </> : <div className="recall-empty"><h3>{hasPlate ? 'בדיקת הריקולים טרם בוצעה.' : 'מספר הרישוי מאפשר לבדוק גם ריקולים.'}</h3><p>בבדיקה לפי מספר רישוי נחפש קריאות פתוחות במאגר הישראלי. VIN לבדו אינו משמש לחיפוש במאגר הזה.</p><button className="text-button" onClick={hasPlate ? onRetry : onPlate}>{hasPlate ? 'בדיקת ריקולים' : 'מעבר לבדיקה לפי מספר רישוי'} <Icon name="arrow" size={16} /></button></div>}
    <div className="recall-footer"><a href="https://www.tesla.com/he_il/support/recall" target="_blank" rel="noreferrer">בירור ריקולים מול טסלה <Icon name="link" size={13} /></a><a href={RECALL_SOURCE_URL} target="_blank" rel="noreferrer">מקור הנתונים <Icon name="link" size={13} /></a></div>
    <p className="recall-separation">ריקול הוא קריאה רשמית לתיקון. דיווחים על החלפת סוללות אינם כשלעצמם ריקול. גם ריקול המגעונים האמריקאי <bdi>25V690</bdi> אינו אותו אירוע של מארז BYD.</p>
  </section>
}
