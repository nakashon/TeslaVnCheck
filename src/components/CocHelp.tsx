import { useState } from 'react'
import { Icon } from './Icon.tsx'

const requestText = `שלום,
ברצוני לזהות את תצורת הסוללה של הרכב שמספר השלדה שלו הוא: [יש להשלים VIN].
אבקש העתק של תעודת התאמה של היצרן (Certificate of Conformity / CoC), אם קיימת לרכב, כולל סעיף 0.2: Type / Variant / Version ומספר אישור התקינה.
אם לא ניתן לספק CoC, אבקש אישור בכתב של תצורת הסוללה המקורית ושל זהות מארז המתח הגבוה המותקן כיום, כולל יצרן/סוג המארז, מספר חלק מלא וגרסה.
אם המארז הוחלף, אבקש גם את פרטי ההחלפה ואת מספר החלק של המארז שהותקן.
תודה.`

export function CocHelp() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle')
  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestText)
      setCopyState('copied')
    } catch {
      setCopyState('manual')
    }
  }
  return <aside className="coc-help" aria-labelledby="coc-help-title">
    <h3 id="coc-help-title">מאיפה משיגים את ה־CoC?</h3>
    <p>זו תעודת התאמה של היצרן, לא רישיון הרכב הישראלי. זהו מידע משלים: אפשר להמשיך בבדיקה גם בלעדיה.</p>
    <ol>
      <li><strong>בדקו במסמכי המסירה או היבוא.</strong> חפשו מסמך בשם <bdi>Certificate of Conformity</bdi>. אפשר לבדוק גם מסמכים זמינים ב־<a href="https://www.tesla.com/teslaaccount" target="_blank" rel="noreferrer">חשבון טסלה</a>, אך אין הבטחה שה־CoC מופיע שם.</li>
      <li><strong>אין מסמך? פנו לטסלה דרך האפליקציה או לשירות היבואן.</strong> בקשו CoC לרכב לפי ה־VIN, אם קיים, או אישור בכתב של תצורת הסוללה. הזמינות ותנאי ההנפקה בישראל דורשים בירור מול טסלה או היבואן.</li>
      <li><strong>בודקים לפני קנייה?</strong> בקשו מהמוכר את המסמך, או שיפנה בעצמו לטסלה. אין צורך למסור לנו פרטי גישה לחשבון.</li>
    </ol>
    <p><strong>כשהמסמך בידיכם:</strong> בסעיף <bdi>0.2 — Type / Variant / Version</bdi> חפשו את שדה <bdi>Variant</bdi>. בחרו <bdi>Y7CR</bdi> רק אם זה הקוד שמופיע במפורש. קוד דגם ישראלי או הוראת רישום אינם תחליף לקוד הזה.</p>
    <label htmlFor="coc-request">נוסח מוכן לפנייה לטסלה — השלימו VIN לפני השליחה</label>
    <textarea id="coc-request" rows={8} readOnly value={requestText} onFocus={event => event.currentTarget.select()} />
    <button className="secondary-button" type="button" onClick={copyRequest}><Icon name="link" size={15} />העתקת נוסח הפנייה</button>
    {copyState !== 'idle' && <p role={copyState === 'manual' ? 'alert' : 'status'}>{copyState === 'copied' ? 'הנוסח הועתק. השלימו את ה־VIN ושלחו לטסלה או ליבואן; האתר לא שולח את הבקשה.' : 'ההעתקה נחסמה בדפדפן. סמנו והעתיקו ידנית מהשדה למעלה.'}</p>}
    <p>ה־CoC מתאר את התצורה המקורית, לא בהכרח סוללה שהוחלפה. אין לנו דרך מאומתת לשלוף את המסמך אוטומטית לפי מספר רישוי או VIN.</p>
    <a className="coc-source" href="https://www.tesla.com/en_GB/support/second-hand-purchase" target="_blank" rel="noreferrer">הנחיית טסלה לבקשת CoC — אתר בריטניה <Icon name="link" size={13} /></a>
    <p>עמוד <bdi>EU Declarations of Conformity</bdi> של טסלה מפרסם הצהרות לרכיבים; הוא אינו תעודת ה־CoC האישית של הרכב.</p>
  </aside>
}
