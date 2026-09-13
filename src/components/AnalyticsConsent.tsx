import { useEffect, useRef, useState } from 'react'
import { analyticsState, chooseAnalyticsConsent, subscribeAnalytics } from '../lib/analytics.ts'

export function AnalyticsConsent() {
  const [state, setState] = useState(analyticsState)
  const [open, setOpen] = useState(false)
  const [readingPrivacy, setReadingPrivacy] = useState(() => ['#privacy', '#accessibility'].includes(window.location.hash))
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const visible = state.enabled && (open || (state.consent === 'unset' && !readingPrivacy))
  useEffect(() => subscribeAnalytics(() => setState(analyticsState())), [])
  useEffect(() => {
    const dialog = dialogRef.current
    if (visible && dialog && !dialog.open) {
      dialog.showModal()
      headingRef.current?.focus()
    } else if (!visible && dialog?.open) dialog.close()
  }, [visible])
  function dismiss() {
    dialogRef.current?.close()
    setOpen(false)
    setReadingPrivacy(true)
  }
  if (!state.enabled) return <section className="analytics-preferences" id="analytics-preferences" aria-label="העדפות מדידה"><p className="analytics-disabled">מדידת שימוש אינה מופעלת באתר כרגע.</p></section>
  function choose(choice: 'granted' | 'denied') {
    chooseAnalyticsConsent(choice)
    dismiss()
  }
  return <section className="analytics-preferences" id="analytics-preferences" aria-label="העדפות פרטיות">
    <button className="text-button" onClick={() => setOpen(value => !value)} aria-expanded={visible} aria-controls="analytics-consent">פרטיות והעדפות מדידה</button>
    <dialog ref={dialogRef} className="analytics-consent" id="analytics-consent" aria-labelledby="analytics-consent-title" aria-describedby="analytics-consent-description" onCancel={event => { event.preventDefault(); dismiss() }} onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first || !last) return
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }}>
      <h2 id="analytics-consent-title" ref={headingRef} tabIndex={-1}>לעזור לנו להבין מה עובד?</h2>
      <p id="analytics-consent-description">באישורכם נשתמש ב־Google Analytics למדידת ביקורים, מקורות הגעה ופעולות כמו בדיקה ושיתוף. המדידה משתמשת בעוגיות דפדפן. לא נשלחים מספרי רישוי, VIN, פרטי הרכב או תוכן הדוח.</p>
      <p>האתר עובד גם ללא אישור. אפשר לשנות את הבחירה כאן בכל עת. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">מדיניות הפרטיות של Google</a></p>
      <a href="#privacy" onClick={event => {
        event.preventDefault()
        dismiss()
        requestAnimationFrame(() => {
          window.location.hash = 'privacy'
          document.getElementById('privacy')?.focus()
        })
      }}>להצהרת הפרטיות המלאה שלנו</a>
      <div className="analytics-actions"><button className="secondary-button" onClick={() => choose('denied')}>ללא מדידה</button><button className="secondary-button" onClick={() => choose('granted')}>אישור מדידה</button></div>
      {state.loadState === 'blocked' && <p role="status">המדידה אינה זמינה בדפדפן כרגע. בדיקת הרכב ממשיכה לעבוד כרגיל.</p>}
      <button className="text-button consent-dismiss" onClick={dismiss}>סגירה ללא בחירה</button>
    </dialog>
    {state.storageUnavailable && <p className="analytics-storage-notice" role="status">לא ניתן לשמור את הבחירה בדפדפן. היא חלה על העמוד הנוכחי בלבד.</p>}
  </section>
}
