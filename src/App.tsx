import { useEffect, useRef, useState } from 'react'
import { assess, InputError, normalizePlate, normalizeVin, RESEARCH_DATE, SOURCES } from './lib/checker.ts'
import type { Language, Localized, Replacement, Status, Variant } from './lib/checker.ts'
import { lookupPlate, LookupError } from './lib/govil.ts'
import './App.css'

const statusText: Record<Status, { title: Localized; description: Localized }> = {
  candidate: {
    title: { en: 'Matches the reported profile', he: 'תואם למאפייני הדגם המדווח' },
    description: { en: 'The VIN matches the Berlin-built, 2023–2024 Model Y RWD profile. It does not identify the battery supplier or a defective batch.', he: 'ה-VIN תואם למודל Y בהנעה אחורית, ייצור ברלין בשנים 2023–2024. הוא לא מזהה את ספק הסוללה או אצווה פגומה.' },
  },
  outside: {
    title: { en: 'Outside this reported profile', he: 'מחוץ למאפייני הדגם המדווח' },
    description: { en: 'At least one known vehicle characteristic differs from the profile studied here. This is not a clean bill of health or proof of a different installed battery.', he: 'לפחות מאפיין ידוע אחד שונה מהדגם שנחקר כאן. זו אינה קביעה שהרכב תקין או הוכחה לזהות הסוללה המותקנת.' },
  },
  'document-supported': {
    title: { en: 'BYD configuration supported', he: 'יש תמיכה בזיהוי תצורת BYD' },
    description: { en: 'The VIN profile and the Y7CR variant you entered agree with the documented BYD original configuration. Your document has not been independently authenticated.', he: 'מאפייני ה-VIN וקוד Y7CR שהזנת תואמים לתצורת BYD המקורית המתועדת. המסמך שלך לא אומת באופן עצמאי.' },
  },
  conflicting: {
    title: { en: 'The evidence needs a closer look', he: 'המידע דורש בירור נוסף' },
    description: { en: 'The identifiers or document details do not agree. Ask Tesla to confirm the original configuration and current pack; do not rely on a supplier guess.', he: 'המזהים או פרטי המסמך אינם מתיישבים. יש לבקש מטסלה לאשר את התצורה המקורית ואת המארז הנוכחי, ולא להסתמך על ניחוש.' },
  },
  unknown: {
    title: { en: 'Not enough information yet', he: 'עדיין אין מספיק מידע' },
    description: { en: 'This VIN contains an unsupported or unresolved configuration. We cannot reliably classify it from the documentation currently available.', he: 'ה-VIN מציג תצורה שאינה נתמכת או שאינה ברורה. אין אפשרות לסווג אותה באופן אמין לפי התיעוד הקיים.' },
  },
}

const errorText: Record<string, Localized> = {
  invalid_vin: { en: 'Enter 17 letters and digits. VINs do not contain I, O or Q.', he: 'יש להזין 17 אותיות וספרות. VIN אינו כולל I, O או Q.' },
  invalid_plate: { en: 'Enter an Israeli plate with 5–8 digits. Spaces and hyphens are allowed.', he: 'יש להזין מספר רישוי ישראלי בן 5–8 ספרות. אפשר להשתמש ברווחים ובמקפים.' },
  plate_not_found: { en: 'No matching vehicle in the active registry. An inactive or recently registered vehicle may be missing. Try its VIN instead.', he: 'לא נמצא רכב במאגר הפעיל. רכב שירד מהכביש או נרשם לאחרונה עשוי להיות חסר. אפשר להזין VIN במקום.' },
  vin_unavailable: { en: 'A vehicle record was found, but its VIN is missing or unusable. Enter the VIN from the car or registration document.', he: 'נמצאה רשומת רכב, אבל ה-VIN חסר או לא תקין. יש להזין אותו מהרכב או מרישיון הרכב.' },
  upstream_timeout: { en: 'The government registry took too long to respond. Try again or enter the VIN directly.', he: 'מאגר משרד התחבורה לא הגיב בזמן. אפשר לנסות שוב או להזין VIN ישירות.' },
  upstream_unavailable: { en: 'The government registry is temporarily unavailable. No vehicle result was inferred. Try again or use a VIN.', he: 'מאגר משרד התחבורה אינו זמין כרגע. לא הוסק מידע על הרכב. אפשר לנסות שוב או להזין VIN.' },
  upstream_invalid: { en: 'The registry returned an unexpected record. We could not reliably resolve this plate. Try a VIN instead.', he: 'המאגר החזיר רשומה בלתי צפויה. לא ניתן לזהות את הרכב באופן אמין. אפשר להזין VIN במקום.' },
  rate_limited: { en: 'Too many lookups. Please wait a minute before trying again.', he: 'בוצעו יותר מדי חיפושים. יש להמתין דקה ולנסות שוב.' },
  network_error: { en: 'Could not reach the lookup service. Check your connection and try again.', he: 'לא ניתן להתחבר לשירות. יש לבדוק את החיבור ולנסות שוב.' },
  invalid_request: { en: 'The request was not accepted. Check the identifier and try again.', he: 'הבקשה לא התקבלה. יש לבדוק את המזהה ולנסות שוב.' },
  internal_error: { en: 'The lookup could not be completed. Please try again.', he: 'לא ניתן להשלים את החיפוש. יש לנסות שוב.' },
}

function Icon({ name, size = 20 }: { name: 'arrow' | 'shield' | 'search' | 'bolt' | 'check' | 'plus'; size?: number }) {
  const paths = {
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    shield: 'M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3Zm-4 9 3 3 5-6',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    bolt: 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
    check: 'm5 12 4 4L19 6',
    plus: 'M12 5v14M5 12h14',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

type Lookup = { vin: string; demo: boolean; source: 'vin' | 'plate'; make: string | null; modelCode: string | null; directive: string | null }

export default function App() {
  const [lang, setLang] = useState<Language>(() => navigator.language.startsWith('he') ? 'he' : 'en')
  const [mode, setMode] = useState<'vin' | 'plate'>('vin')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [variant, setVariant] = useState<Variant>('unknown')
  const [replacement, setReplacement] = useState<Replacement>('unknown')
  const request = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLElement | null>(null)
  const t = (en: string, he: string) => lang === 'en' ? en : he
  const result = lookup ? assess(lookup.vin, variant, replacement) : null

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
  }, [lang])
  useEffect(() => () => request.current?.abort(), [])

  function reset() {
    request.current?.abort()
    request.current = null
    setBusy(false)
    setError(null)
    setLookup(null)
    setVariant('unknown')
    setReplacement('unknown')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setError(null)
    setLookup(null)
    setVariant('unknown')
    setReplacement('unknown')
    try {
      const value = mode === 'vin' ? normalizeVin(input) : normalizePlate(input)
      setBusy(true)
      if (mode === 'vin') {
        // VIN decoding stays on the device; only a plate lookup contacts the server.
        setLookup({ vin: value, demo: false, source: 'vin', make: null, modelCode: null, directive: null })
      } else {
        const vehicle = await lookupPlate(value, fetch, controller.signal)
        if (controller.signal.aborted) return
        setLookup({
          vin: vehicle.vin, source: 'plate', demo: false,
          make: vehicle.make, modelCode: vehicle.modelCode, directive: vehicle.directive,
        })
      }
      requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }))
    } catch (err) {
      if (controller.signal.aborted) return
      if (err instanceof InputError) setError(err.code)
      else if (err instanceof LookupError) setError(err.code)
      else if (err instanceof TypeError) setError('network_error')
      else if (err instanceof SyntaxError) setError('upstream_invalid')
      else {
        console.error('Unexpected lookup UI failure', err instanceof Error ? err.name : 'UnknownError')
        setError('internal_error')
      }
    } finally {
      if (request.current === controller) setBusy(false)
    }
  }

  function demo() {
    reset()
    setMode('vin')
    setInput('XP7YGCFR0PB000001')
    setLookup({ vin: 'XP7YGCFR0PB000001', demo: true, source: 'vin', make: null, modelCode: null, directive: null })
  }

  const criteriaLabels = {
    model: t('Model Y', 'מודל Y'), factory: t('Built in Berlin', 'ייצור ברלין'),
    year: t('Built in 2023–2024', 'ייצור בשנים 2023–2024'), drive: t('Rear-wheel drive', 'הנעה אחורית'),
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#checker">{t('Skip to checker', 'מעבר לבדיקה')}</a>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Battery Atlas"><span className="brand-icon"><Icon name="bolt" size={22} /></span><span>Battery<span className="brand-light">Atlas</span><span className="beta">BETA</span></span></a>
        <nav aria-label={t('Main navigation', 'ניווט ראשי')}>
          <a href="#methodology">{t('How it works', 'איך זה עובד')}</a>
          <a href="#research">{t('The research', 'המחקר')}</a>
          <button className="language-button" onClick={() => setLang(lang === 'en' ? 'he' : 'en')} aria-label={t('Switch to Hebrew', 'מעבר לאנגלית')}>{lang === 'en' ? 'עברית' : 'English'} <span aria-hidden="true">↗</span></button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="status-dot" /> {t('INDEPENDENT TESLA BATTERY RESEARCH', 'מחקר עצמאי על סוללות טסלה')}</div>
          <h1>{t('Know your battery.', 'להכיר את הסוללה שלך.')}<br /><span>{t('Not the rumors.', 'לא את השמועות.')}</span></h1>
          <p className="hero-description">{t('Does your Model Y match the BYD battery configuration in recent reports? Start with a VIN or an Israeli license plate. We’ll show what the evidence can—and can’t—tell you.', 'האם המודל Y שלך תואם לתצורת סוללת BYD שעלתה בדיווחים? מתחילים עם VIN או מספר רישוי ישראלי, ומגלים מה אפשר לדעת לפי הראיות — ומה עדיין לא.')}</p>
          <div className="hero-pills"><span><Icon name="shield" size={15} /> {t('No sign-up. No saved identifiers.', 'ללא הרשמה. המזהים לא נשמרים.')}</span><span className="divider-dot">·</span><span>{t('Built on cited sources', 'מבוסס על מקורות מצוטטים')}</span></div>
        </section>

        <section className="workspace" id="checker" aria-label={t('Battery configuration checker', 'בדיקת תצורת הסוללה')}>
          <div className="input-card">
            <div className="section-kicker"><span>01</span> {t('YOUR VEHICLE', 'הרכב שלך')}</div>
            <h2>{t('Let’s start with your car.', 'מתחילים מהרכב שלך.')}</h2>
            <p className="card-subtitle">{t('For your car—or the one you’re about to buy.', 'לרכב שלך — או לרכב שמתכננים לקנות.')}</p>
            <div className="input-tabs" role="group" aria-label={t('Lookup method', 'שיטת חיפוש')}>
              <button aria-pressed={mode === 'vin'} className={mode === 'vin' ? 'active' : ''} onClick={() => { reset(); setInput(''); setMode('vin') }}>{t('VIN number', 'מספר שלדה (VIN)')}</button>
              <button aria-pressed={mode === 'plate'} className={mode === 'plate' ? 'active' : ''} onClick={() => { reset(); setInput(''); setMode('plate') }}><span className="il-tag">IL</span>{t('License plate', 'מספר רישוי')}</button>
            </div>
            <form onSubmit={submit} noValidate>
              <label htmlFor="identifier">{mode === 'vin' ? t('Vehicle identification number', 'מספר זיהוי הרכב') : t('Israeli license plate', 'מספר רישוי ישראלי')}</label>
              <div className={`identifier-wrap ${mode === 'plate' ? 'plate-mode' : ''}`}>
                {mode === 'plate' && <span className="plate-country" aria-hidden="true">IL</span>}
                <input id="identifier" dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode={mode === 'plate' ? 'numeric' : 'text'} value={input} onChange={(event) => { reset(); setInput(event.target.value) }} placeholder={mode === 'vin' ? t('Enter your 17-character VIN', '17 תווים של ה-VIN שלך') : '123-45-678'} maxLength={mode === 'vin' ? 30 : 15} aria-describedby="input-help lookup-error" aria-invalid={Boolean(error)} />
              </div>
              <p className="field-help" id="input-help">{mode === 'vin' ? t('Find it under Controls → Software, or on your registration.', 'מופיע ברכב תחת פקדים ← תוכנה, או ברישיון הרכב.') : t('We use data.gov.il to retrieve the VIN, just like CarAgent. Active vehicles only.', 'ה-VIN נשלף מ-data.gov.il, כמו ב-CarAgent. החיפוש במאגר הרכבים הפעילים בלבד.')}</p>
              <div id="lookup-error" role="alert">{error && <p className="error-message">{(errorText[error] ?? errorText.internal_error)[lang]}</p>}</div>
              <button className="submit-button" disabled={busy || !input.trim()} type="submit">{busy ? <><span className="spinner" />{t('Looking up your vehicle…', 'מחפשים את הרכב שלך…')}</> : <>{t('Check battery configuration', 'בדיקת תצורת הסוללה')}<Icon name="arrow" size={19} /></>}</button>
            </form>
            <button className="demo-button" onClick={demo}>{t('Just exploring? Try a fictional example', 'רק מתעניינים? אפשר לנסות דוגמה פיקטיבית')} <span aria-hidden="true">↗</span></button>
            <div className="privacy-note"><Icon name="shield" size={18} /><p>{t('VIN checks stay in your browser. Plate lookups go directly to the government registry, which receives your plate and IP address. This site does not save identifiers or use analytics.', 'בדיקת VIN מתבצעת בדפדפן בלבד. חיפוש רישוי נשלח ישירות למאגר הממשלתי, שמקבל את מספר הרישוי וכתובת ה-IP שלך. האתר לא שומר מזהים ולא משתמש בכלי מעקב.')}</p></div>
          </div>

          <section className={`result-card ${result ? `has-result ${result.status}` : 'empty-result'}`} aria-label={t('Assessment result', 'תוצאת הבדיקה')} aria-live="polite" aria-busy={busy} tabIndex={-1} ref={resultRef}>
            {!result ? <>
              <div className="section-kicker"><span>02</span> {t('THE BIGGER PICTURE', 'התמונה הרחבה')}</div>
              <div className="battery-illustration" aria-hidden="true">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="battery-shadow" />
                <div className="battery-pack"><div className="pack-top"><span>BYD / LFP</span><Icon name="bolt" size={23} /></div><div className="battery-cells">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div><div className="pack-bottom"><span>STRUCTURAL PACK</span><span>01—09</span></div></div>
                <span className="illustration-label">{t('ILLUSTRATION · NOT A DIAGNOSTIC', 'המחשה בלבד · לא אבחון')}</span>
              </div>
              <h2>{t('Clarity, not a false alarm.', 'בהירות, לא אזעקת שווא.')}</h2>
              <p>{t('We compare your vehicle’s identifiers with the configuration reported in Taiwan: Berlin-built Model Y RWD, primarily 2023–2024, associated with a BYD structural LFP pack.', 'משווים את מזהי הרכב לתצורה שעלתה בדיווחים בטייוואן: מודל Y בהנעה אחורית מברלין, בעיקר בשנים 2023–2024, המזוהה עם מארז LFP מבני של BYD.')}</p>
              <div className="empty-result-footer"><span className="status-dot" />{t('A configuration match is not a defect diagnosis.', 'התאמה לתצורה אינה אבחון תקלה.')}</div>
            </> : <>
              <div className="result-topline"><div className="section-kicker"><span>02</span>{t('YOUR ASSESSMENT', 'ההערכה שלך')}</div><span className="result-badge">{lookup?.demo ? t('FICTIONAL EXAMPLE', 'דוגמה פיקטיבית') : lookup?.source === 'plate' ? 'DATA.GOV.IL' : t('VIN DECODE', 'פענוח VIN')}</span></div>
              <div className="result-symbol"><Icon name={result.status === 'outside' ? 'search' : 'bolt'} size={29} /></div>
              <h2>{statusText[result.status].title[lang]}</h2>
              <p className="result-description">{statusText[result.status].description[lang]}</p>
              <div className="probability-block"><div><span className="probability-label">{t('CHANCE OF THIS BATTERY CONFIGURATION', 'הסיכוי לתצורת הסוללה הזו')}</span><strong>{t('Not yet quantifiable', 'עדיין לא ניתן לכימות')}</strong></div><span className="unknown-percent" aria-label={t('Percentage unknown', 'האחוז אינו ידוע')}>—<small>%</small></span></div>
              <p className="probability-explanation">{t('There is no representative, battery-labeled dataset to calculate a reliable percentage. Matching VIN characteristics are evidence—not a statistical probability.', 'אין מאגר מייצג עם זיהוי סוללות שמאפשר לחשב אחוז אמין. התאמת מאפייני VIN היא ראיה, ולא הסתברות סטטיסטית.')}</p>
              <p className="probability-explanation">{t('VIN decoding does not verify that a vehicle exists. No manufacturer lookup or VIN authentication is performed.', 'פענוח VIN אינו מאמת שהרכב קיים. לא מתבצע חיפוש אצל היצרן או אימות מקוריות VIN.')}</p>
              <div className="criteria-list">{result.criteria.map((criterion) => <div key={criterion.id}><span className={`criterion-icon ${criterion.match === true ? 'matched' : ''}`}>{criterion.match === true ? <Icon name="check" size={13} /> : criterion.match === false ? '−' : '?'}</span><span>{criteriaLabels[criterion.id]}</span><span className="criterion-status">{criterion.match === true ? t('Matches', 'תואם') : criterion.match === false ? t('Differs', 'שונה') : t('Unknown', 'לא ידוע')}</span></div>)}</div>
              <div className="vehicle-facts"><div><span>{t('Factory', 'מפעל')}</span><strong>{result.decoded.factory ?? '—'}</strong></div><div><span>{t('Build / model year', 'שנת ייצור / דגם')}</span><strong>{result.decoded.year ?? '—'}</strong></div><div><span>{t('Current battery', 'סוללה נוכחית')}</span><strong>{replacement === 'no' ? t('Original, per owner', 'מקורית, לפי הבעלים') : t('Unverified', 'לא אומתה')}</strong></div></div>
              {lookup?.source === 'plate' && <p className="registry-details">{t('Registry model code', 'קוד דגם במאגר')}: {lookup.modelCode ?? '—'} · {t('Directive', 'הוראת רישום')}: {lookup.directive ?? '—'}<br />{t('These identifiers are not yet mapped to battery suppliers.', 'המזהים האלה עדיין אינם ממופים לספקי סוללות.')}</p>}
              <details className="refine-details"><summary><Icon name="plus" size={16} />{t('Have a CoC or replacement history?', 'יש תעודת CoC או היסטוריית החלפה?')}</summary><div className="refine-fields"><label htmlFor="variant">{t('CoC item 0.2: exact variant', 'סעיף 0.2 בתעודת CoC: תת-דגם מדויק')}</label><select id="variant" value={variant} onChange={(event) => { const value = event.target.value; if (value === 'Y7CR' || value === 'other' || value === 'unknown') setVariant(value) }}><option value="unknown">{t('I don’t know / no document', 'לא ידוע / אין מסמך')}</option><option value="Y7CR">Y7CR</option><option value="other">{t('A different variant', 'קוד תת-דגם אחר')}</option></select><label htmlFor="replacement">{t('Has the high-voltage battery been replaced?', 'האם סוללת המתח הגבוה הוחלפה?')}</label><select id="replacement" value={replacement} onChange={(event) => { const value = event.target.value; if (value === 'yes' || value === 'no' || value === 'unknown') setReplacement(value) }}><option value="unknown">{t('I don’t know', 'לא ידוע')}</option><option value="no">{t('No, it is the original pack', 'לא, זהו המארז המקורי')}</option><option value="yes">{t('Yes, it has been replaced', 'כן, הסוללה הוחלפה')}</option></select><p>{t('Owner-entered information is not independently verified. A replacement pack cannot be identified from the VIN. Ask Tesla for its full assembly number and revision; do not run service-mode tests.', 'מידע שהוזן על ידי הבעלים אינו מאומת עצמאית. לא ניתן לזהות מארז חלופי לפי VIN. יש לבקש מטסלה מספר מכלול מלא וגרסה; אין לבצע בדיקות במצב שירות.')}</p></div></details>
              <div className="next-steps"><h3>{t('Turn the result into a better question.', 'מה כדאי לברר עכשיו?')}</h3><p><strong>{t('Buying?', 'קונים?')}</strong> {t('Ask the seller for the CoC, battery-replacement invoices, and Tesla confirmation of the installed pack. This result does not replace a pre-purchase inspection.', 'בקשו מהמוכר תעודת CoC, חשבוניות על החלפת סוללה ואישור מטסלה לזהות המארז המותקן. התוצאה אינה מחליפה בדיקה לפני קנייה.')}</p><p><strong>{t('Already an owner?', 'כבר בעלי הרכב?')}</strong> {t('Confirm your battery identity and warranty with Tesla. Keep repair records and follow any vehicle alerts; don’t change charging habits based on this result.', 'בררו מול טסלה את זהות הסוללה ואת האחריות. שמרו מסמכי תיקון ופעלו לפי התראות הרכב. אין לשנות הרגלי טעינה על סמך התוצאה הזו.')}</p></div>
            </>}
          </section>
        </section>

        <aside className="safety-banner"><span className="safety-icon">!</span><p><strong>{t('An alert on your screen comes first.', 'התראה ברכב קודמת לכל בדיקה כאן.')}</strong> {t('This tool does not diagnose faults or check recalls. Follow the vehicle’s instructions and contact Tesla for BMS alerts—even if your car is outside this profile.', 'הכלי אינו מאבחן תקלות ואינו בודק ריקולים. יש לפעול לפי הוראות הרכב ולפנות לטסלה בעקבות התראות BMS, גם אם הרכב מחוץ למאפיינים האלה.')}</p><a href="https://www.tesla.com/he_il/support/recall" target="_blank" rel="noreferrer">{t('Tesla recalls', 'ריקולים בטסלה')} ↗</a></aside>

        <section className="methodology" id="methodology">
          <div className="section-heading"><div><div className="eyebrow">{t('LESS GUESSWORK. MORE CONTEXT.', 'פחות ניחושים. יותר הקשר.')}</div><h2>{t('Three questions. Not one.', 'שלוש שאלות. לא אחת.')}</h2></div><p>{t('Knowing a battery’s family is not the same as knowing its condition.', 'זיהוי משפחת הסוללה אינו מעיד על מצבה.')}</p></div>
          <div className="method-grid">{[
            { number: '01', title: t('What was built?', 'מה יוצר?'), text: t('The VIN indicates vehicle characteristics. A matching Y7CR approval variant supports the original BYD configuration—not a defective batch.', 'ה-VIN מצביע על מאפייני הרכב. קוד התקינה Y7CR תומך בזיהוי תצורת BYD המקורית, לא בזיהוי אצווה פגומה.'), tag: t('VIN + original documents', 'VIN ומסמכים מקוריים') },
            { number: '02', title: t('What’s installed now?', 'מה מותקן עכשיו?'), text: t('A replacement battery keeps the same vehicle VIN. Current pack identity needs service records or Tesla confirmation.', 'החלפת סוללה אינה משנה את ה-VIN. זיהוי המארז הנוכחי דורש מסמכי שירות או אישור מטסלה.'), tag: t('Service records', 'מסמכי שירות') },
            { number: '03', title: t('Is there a fault?', 'האם יש תקלה?'), text: t('Only proper diagnostics can establish a malfunction. No validated VIN-level defect rule or failure probability is available for this cluster.', 'תקלה נקבעת רק באמצעות אבחון מתאים. לא קיים בידינו כלל מאומת לזיהוי פגם או הסתברות לכשל ברמת VIN בקבוצה הזו.'), tag: t('Professional diagnosis', 'אבחון מקצועי') },
          ].map((item) => <article key={item.number}><span className="method-number">{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><span className="method-tag">{item.tag}</span></article>)}</div>
        </section>

        <section className="research-section" id="research">
          <div className="research-intro"><div className="eyebrow">{t('OPEN EVIDENCE', 'ראיות גלויות')}</div><h2>{t('Don’t take our word for it.', 'לא צריך להסתמך רק עלינו.')}</h2><p>{t('Taiwan owner reports document structural-pack replacements. The proposed sealing / moisture explanation remains unconfirmed. Korea’s BMS_a079 cases and US recall 25V690 are separate evidence tracks.', 'דיווחי בעלים בטייוואן מתעדים החלפות מארזים מבניים. הסבר האיטום או הלחות עדיין לא אושר. מקרי BMS_a079 בקוריאה וריקול 25V690 בארה״ב הם נושאים נפרדים.')}</p><span className="research-date">{t('Evidence reviewed', 'הראיות נבדקו בתאריך')} <time dateTime={RESEARCH_DATE}>{RESEARCH_DATE}</time></span></div>
          <div className="sources-list">{SOURCES.map((source, index) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer"><span className="source-number">0{index + 1}</span><span><strong>{source.title[lang]}</strong><small>{source.kind[lang]}</small></span><span aria-hidden="true">↗</span></a>)}</div>
        </section>
      </main>
      <footer><span className="footer-brand">BatteryAtlas <span> / {t('Clarity through evidence.', 'בהירות דרך ראיות.')}</span></span><p>{t('Independent project. Not affiliated with Tesla or BYD.', 'פרויקט עצמאי. אינו קשור לטסלה או ל-BYD.')}</p></footer>
    </div>
  )
}
