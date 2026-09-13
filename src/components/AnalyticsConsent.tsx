import { useEffect, useState } from 'react'
import { analyticsState, chooseAnalyticsConsent, subscribeAnalytics } from '../lib/analytics.ts'

export function AnalyticsConsent() {
  const [state, setState] = useState(analyticsState)
  const [open, setOpen] = useState(false)
  useEffect(() => subscribeAnalytics(() => setState(analyticsState())), [])
  if (!state.enabled) return null
  function choose(choice: 'granted' | 'denied') {
    chooseAnalyticsConsent(choice)
    setOpen(false)
  }
  return <section className="analytics-preferences" aria-label="העדפות פרטיות">
    <button className="text-button" onClick={() => setOpen(value => !value)} aria-expanded={open || state.consent === 'unset'} aria-controls="analytics-consent">פרטיות והעדפות מדידה</button>
    {(open || state.consent === 'unset') && <aside className="analytics-consent" id="analytics-consent" aria-labelledby="analytics-consent-title">
      <h2 id="analytics-consent-title">לעזור לנו להבין מה עובד?</h2>
      <p>באישורכם נשתמש ב־Google Analytics למדידת ביקורים, מקורות הגעה ופעולות כמו בדיקה ושיתוף. המדידה משתמשת בעוגיות דפדפן. לא נשלחים מספרי רישוי, VIN, פרטי הרכב או תוכן הדוח.</p>
      <p>האתר עובד גם ללא אישור. אפשר לשנות את הבחירה כאן בכל עת. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">מדיניות הפרטיות של Google</a></p>
      <div className="analytics-actions"><button className="secondary-button" onClick={() => choose('denied')}>ללא מדידה</button><button className="secondary-button" onClick={() => choose('granted')}>אישור מדידה</button></div>
      {state.loadState === 'blocked' && <p role="status">המדידה אינה זמינה בדפדפן כרגע. בדיקת הרכב ממשיכה לעבוד כרגיל.</p>}
    </aside>}
    {state.storageUnavailable && <p className="analytics-storage-notice" role="status">לא ניתן לשמור את הבחירה בדפדפן. היא חלה על העמוד הנוכחי בלבד.</p>}
  </section>
}
