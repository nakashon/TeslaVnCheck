import { useState } from 'react'
import { assessmentTone } from '../lib/checker.ts'
import type { Assessment, Replacement, Status, Variant } from '../lib/checker.ts'
import { Icon } from './Icon.tsx'

const copy: Record<Status, { label: string; title: string; detail: string }> = {
  candidate: {
    label: 'התאמה לקבוצה המדווחת',
    title: 'הרכב תואם לקבוצת הדגם שעליה דווח.',
    detail: 'מודל Y, הנעה אחורית, ייצור ברלין בשנים 2023–2024. השלב הבא הוא לזהות את מארז הסוללה שמותקן ברכב.',
  },
  'document-supported': {
    label: 'תצורת BYD נתמכת',
    title: 'גם קוד הדגם שציינתם מצביע על תצורת BYD.',
    detail: 'קוד Y7CR תואם לתצורת המארז המבני המקורית. הזיהוי מבוסס על פרטי המסמך שהזנתם.',
  },
  outside: {
    label: 'מחוץ לקבוצה שנבדקת',
    title: 'הרכב אינו תואם לקבוצת הדגם הזו.',
    detail: 'לפחות אחד ממאפייני הרכב שונה מהקבוצה שעליה דווח. בהמשך אפשר לראות בדיוק מה שונה ולבדוק ריקולים בנפרד.',
  },
  conflicting: {
    label: 'יש סתירה בפרטים',
    title: 'צריך ליישב את פרטי הרכב.',
    detail: 'ה-VIN או קוד המסמך שהזנתם אינם מתיישבים זה עם זה. בדקו את ההקלדה והשוו לרישיון או לתעודת ההתאמה.',
  },
  unknown: {
    label: 'חסר מידע להשלמת הזיהוי',
    title: 'נדרש פרט נוסף כדי לקבוע התאמה.',
    detail: 'הפרטים שניתן לפענח מופיעים כאן. קוד מתעודת ההתאמה או אישור מטסלה יכולים להשלים את התמונה.',
  },
}

const labels = { model: 'מודל Y', factory: 'ייצור ברלין', year: 'שנות ייצור 2023–2024', drive: 'הנעה אחורית' }

export function BatteryResult({ result, variant, replacement, setVariant, setReplacement, readOnly = false }: {
  result: Assessment
  variant: Variant
  replacement: Replacement
  setVariant: (value: Variant) => void
  setReplacement: (value: Replacement) => void
  readOnly?: boolean
}) {
  const [audience, setAudience] = useState<'buyer' | 'owner'>('buyer')
  const tone = assessmentTone(result.status)
  const text = copy[result.status]
  return <section className="battery-result" data-tone={tone} aria-labelledby="battery-result-title">
    <div className="result-intro">
      <span className="outcome-badge"><Icon name={tone === 'clear' ? 'check' : 'info'} size={16} />{text.label}</span>
      <span className="section-index">01 / סוללה</span>
    </div>
    <h2 id="battery-result-title">{text.title}</h2>
    <p className="result-summary">{text.detail}</p>
    <div className="match-panel">
      <div className="match-total"><bdi><strong>{result.profileMatch.matched}</strong><span> / {result.profileMatch.total}</span></bdi><span>מאפייני הדגם תואמים</span></div>
      <div className="match-detail">
        <div className="match-segments" aria-hidden="true">{result.criteria.map((item) => <span key={item.id} data-match={item.match === null ? 'unknown' : String(item.match)} />)}</div>
        <p>{result.profileMatch.different} שונים <span>·</span> {result.profileMatch.unknown} לא ידועים</p>
        <small>זו ספירת מאפיינים, לא אחוז סיכון לתקלה.</small>
      </div>
    </div>
    <div className="criteria-list">{result.criteria.map((item) => <div key={item.id}>
      <span className="criterion-mark" data-match={item.match === null ? 'unknown' : String(item.match)}>{item.match === true ? <Icon name="check" size={14} /> : item.match === false ? <Icon name="minus" size={14} /> : '?'}</span>
      <span>{labels[item.id]}</span><strong>{item.match === true ? 'תואם' : item.match === false ? 'שונה' : 'לא ידוע'}</strong>
    </div>)}</div>
    {!readOnly && <details className="refine-details">
      <summary><Icon name="plus" size={17} />יש מסמך סוללה או מידע על החלפה? דייקו את התוצאה</summary>
      <div className="refine-fields">
        <label htmlFor="variant">קוד תת-הדגם בתעודת ההתאמה (CoC), סעיף 0.2</label>
        <select id="variant" value={variant} onChange={(event) => { const value = event.target.value; if (value === 'unknown' || value === 'Y7CR' || value === 'other') setVariant(value) }}>
          <option value="unknown">אין לי את המסמך / לא ידוע</option><option value="Y7CR">Y7CR</option><option value="other">מופיע קוד אחר</option>
        </select>
        <label htmlFor="replacement">האם סוללת המתח הגבוה הוחלפה?</label>
        <select id="replacement" value={replacement} onChange={(event) => { const value = event.target.value; if (value === 'unknown' || value === 'no' || value === 'yes') setReplacement(value) }}>
          <option value="unknown">לא ידוע</option><option value="no">לא, המארז המקורי עדיין מותקן</option><option value="yes">כן, הסוללה הוחלפה</option>
        </select>
        <p>פרטי המסמך וההחלפה הם מידע שהזנתם, ולא אימות מטעם היצרן.</p>
      </div>
    </details>}
    {replacement === 'yes' && <div className="replacement-note"><Icon name="info" size={19} /><p><strong>הסוללה הוחלפה — ה-VIN נשאר זהה.</strong> ההתאמה למעלה מתייחסת לרכב המקורי. לזיהוי המארז הנוכחי נדרש מספר המכלול המלא והגרסה מחשבונית השירות או מטסלה.</p></div>}
    <div className="next-steps">
      <div className="next-heading"><h3>מה עושים עם התוצאה?</h3><div className="audience-tabs" role="group" aria-label="מידע לקונים או לבעלים"><button aria-pressed={audience === 'buyer'} onClick={() => setAudience('buyer')}>לפני קנייה</button><button aria-pressed={audience === 'owner'} onClick={() => setAudience('owner')}>הרכב שלי</button></div></div>
      {audience === 'buyer' ? <p>{tone === 'attention' ? 'בקשו מהמוכר את תעודת ההתאמה ואת היסטוריית החלפת הסוללה. ' : 'בדקו את היסטוריית הטיפולים ואת האחריות שנותרה. '}ודאו מול טסלה מהו המארז המותקן, ובדקו את הריקולים שמופיעים בהמשך לפני השלמת העסקה.</p>
        : <p>{tone === 'attention' ? 'בררו באפליקציית טסלה את זהות המארז ואת כיסוי האחריות ושמרו מסמכי שירות. ' : 'שמרו את פרטי הרכב ומסמכי השירות ובדקו ריקולים פתוחים. '}אם מופיעה התראת BMS, פעלו לפי ההודעה ברכב ופנו לשירות.</p>}
    </div>
    <p className="result-footnote">התאמה לקבוצת דגם אינה אבחון סוללה תקולה, ואי-התאמה אינה אישור לתקינות הרכב.</p>
  </section>
}
