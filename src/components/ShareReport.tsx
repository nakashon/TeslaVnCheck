import { useEffect, useRef, useState } from 'react'
import type { Assessment, Replacement, Variant } from '../lib/checker.ts'
import type { RecallState } from './RecallPanel.tsx'
import { createReport, reportLink } from '../lib/share.ts'
import { renderReportImage } from '../lib/report-image.ts'
import { Icon } from './Icon.tsx'

export function ShareReport({ assessment, variant, replacement, recalls }: {
  assessment: Assessment; variant: Variant; replacement: Replacement; recalls: RecallState
}) {
  const [busy, setBusy] = useState(false)
  const [generated, setGenerated] = useState<{ blob: Blob; image: string; link: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(false)
  const generation = useRef(0)
  const imageRef = useRef<string | null>(null)
  useEffect(() => () => {
    generation.current++
    if (imageRef.current) URL.revokeObjectURL(imageRef.current)
  }, [])
  async function generate() {
    const current = ++generation.current
    setBusy(true)
    setError(false)
    setNotice('')
    try {
      const summary = recalls.status === 'ready' ? { count: recalls.report.items.length, checkedAt: recalls.report.checkedAt, truncated: recalls.report.truncated } : null
      const report = createReport(assessment.decoded.vin, variant, replacement, summary)
      const link = reportLink(report, window.location.href)
      const blob = await renderReportImage(report, link)
      if (generation.current !== current) return
      if (imageRef.current) URL.revokeObjectURL(imageRef.current)
      const image = URL.createObjectURL(blob)
      imageRef.current = image
      setGenerated({ blob, image, link })
    } catch (err) {
      if (generation.current !== current) return
      console.error('Report image generation failed:', err instanceof Error ? err.name : 'UnknownError')
      setError(true)
      setNotice('לא הצלחנו להפיק את התמונה. אפשר לנסות שוב.')
    } finally {
      if (generation.current === current) setBusy(false)
    }
  }

  async function copyLink() {
    if (!generated) return
    try {
      await navigator.clipboard.writeText(generated.link)
      setError(false)
      setNotice('הקישור הועתק. אפשר לשלוח אותו בוואטסאפ או לצרף למודעה.')
    } catch {
      setError(true)
      setNotice('ההעתקה נחסמה בדפדפן. אפשר להעתיק ידנית מהשדה שמתחת.')
    }
  }

  async function share() {
    if (!generated) return
    const file = new File([generated.blob], 'TestMaTesla-report.png', { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'דוח הרכב שלי ב־TestMaTesla', text: `בדקתי את מאפייני הטסלה שלי. אפשר לראות את הדוח ולבדוק גם את הרכב שלכם:\n${generated.link}` })
      } else if (navigator.share) {
        await navigator.share({ title: 'דוח הרכב שלי ב־TestMaTesla', url: generated.link })
      } else {
        await copyLink()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(true)
      setNotice('השיתוף לא הושלם. אפשר להוריד את התמונה או להעתיק את הקישור.')
    }
  }

  return <section className="share-panel" aria-labelledby="share-title">
    <div className="share-heading"><div><span className="eyebrow">המידע שלכם. גם לאחרים.</span><h2 id="share-title">בדקתם? שתפו את התמונה המלאה.</h2><p>דוח זיהוי עם התוצאה, תאריך הבדיקה וקוד QR. לשיתוף עם קונים, חברים או קבוצת הטסלה.</p></div><span className="share-art" aria-hidden="true"><Icon name="scan" size={42} /></span></div>
    <p className="privacy-inline"><Icon name="shield" size={16} />הדוח אינו כולל מספר רישוי או את המספר הסידורי של ה־VIN.</p>
    <button className="primary-button" onClick={generate} disabled={busy}>{busy ? <><span className="spinner" />מפיקים דוח…</> : <><Icon name="plus" size={18} />{generated ? 'הפקת דוח מחדש' : 'הפקת דוח לשיתוף'}</>}</button>
    {generated && <div className="share-preview"><img src={generated.image} alt="תצוגה מקדימה של דוח זיהוי הרכב לשיתוף, ללא מזהי רכב אישיים" /><div className="share-controls"><h3>הדוח מוכן.</h3><p>הקישור פותח סיכום שנוצר כעת, ומאפשר לנמען לבצע בדיקה משלו. זהו דוח ששיתפתם, לא תעודת תקינות.</p><button className="primary-button" onClick={share}><Icon name="link" size={17} />שיתוף הדוח</button><a className="secondary-button" href={generated.image} download="TestMaTesla-report.png">הורדת תמונה</a><button className="text-button" onClick={copyLink}>העתקת קישור</button><label htmlFor="share-link">קישור לדוח</label><input id="share-link" dir="ltr" readOnly value={generated.link} onFocus={(event) => event.currentTarget.select()} /></div></div>}
    <p className={error ? 'error-message' : 'share-notice'} role={error ? 'alert' : 'status'}>{notice}</p>
  </section>
}
