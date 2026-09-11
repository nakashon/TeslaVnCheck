import { Icon } from './Icon.tsx'

export function BatteryExplainer() {
  return <section id="battery-story" className="battery-story">
    <div className="section-heading"><div><span className="eyebrow">הסיפור שמאחורי הבדיקה</span><h2>מה קורה עם סוללות ה־Model Y?</h2></div><p>הבעיה, הדגם הרלוונטי, ומה חשוב לדעת בישראל.</p></div>
    <div className="story-grid">
      <article className="story-main">
        <span className="story-label"><Icon name="bolt" size={16} />במיקוד: מארז BYD מבני מסוג LFP</span>
        <h3>התראה ברכב. לעיתים השבתה.<br />ובחלק מהמקרים — החלפת מארז.</h3>
        <p>בטייוואן תועדו דיווחי בעלי <bdi>Model Y RWD</bdi> על תקלות במערכת המתח הגבוה ועל החלפת מארז הסוללה כולו. הקבוצה שעומדת במוקד הדיווחים היא בעיקר רכבי 2023–2024 מייצור ברלין, עם תצורת הסוללה המבנית של BYD.</p>
        <p>בחלק מהדיווחים הרכב הציג התראה בזמן נהיגה או אחרי טעינה, ובהמשך לא נטען או לא חזר לנסיעה לאחר חניה. במאגר הבטיחות הטייוואני מופיעים גם קודי תקלה ותיאורי עבודות החלפה.</p>
        <a className="text-link" href="https://www.car-safety.org.tw/car_safety/Ajax_GetCarBrokeDescs?id=15844" target="_blank" rel="noreferrer">דיווח בעלים במאגר הבטיחות הרשמי <Icon name="link" size={14} /></a>
        <div className="israel-context"><span>ומה בישראל?</span><p>יש דיווחי קהילה גם בארץ. עדיין אין בידינו רשימה מאומתת של אצוות פגומות או שיעור כשל ישראלי. לכן הבדיקה כאן מזהה התאמה למאפייני קבוצת הדגם, ומכוונת לזיהוי הסוללה בפועל.</p></div>
      </article>
      <div className="story-side">
        <article><span className="mini-icon"><Icon name="search" /></span><h3>מה ידוע על הסיבה?</h3><p>ירידה בבידוד החשמלי יכולה להפעיל הגבלות בטיחות. כשל באיטום או חדירת לחות הוצעו כהסבר, אבל לא נמצאה אצלנו מסקנת יצרן פומבית שמאשרת שזהו הגורם המשותף.</p><a href="https://technews.tw/2026/07/10/tesla-modely-rwd-battery-issue/" target="_blank" rel="noreferrer">המקור להשערת האיטום ↗</a></article>
        <article><span className="mini-icon"><Icon name="shield" /></span><h3>מה נעשה בטייוואן?</h3><p>ביולי 2026 דווח שטסלה התחייבה לבדיקה ולהחלפת סוללות בהתאם לאחריות, לצד סיוע בניידות. החלפה במסגרת האחריות אינה ריקול יזום של כל הרכבים מאותו דגם.</p><a href="https://www.ctee.com.tw/news/20260728701950-430503" target="_blank" rel="noreferrer">הדיווח על תגובת טסלה ↗</a></article>
      </div>
    </div>
    <div className="alerts-heading"><h3>שלושה קודים, לא אותה אבחנה.</h3><a className="text-link" href="https://www.tesla.com/ownersmanual/2020_2024_modely/en_eu/GUID-9A3F0F72-71F4-433D-B68B-0A472A9359DF.html" target="_blank" rel="noreferrer">ההגדרות במדריך טסלה <Icon name="link" size={14} /></a></div>
    <div className="alert-cards">
      <article><code>BMS_a035</code><h4>ירידה בבידוד החשמלי</h4><p>זוהתה ירידה בבידוד של מערכת המתח הגבוה בזמן נהיגה או טעינה. הרכב עלול לא לחזור לנסיעה.</p></article>
      <article><code>BMS_a059</code><h4>אי-התאמה במדידת מתח</h4><p>המתח שנמדד במארז אינו תואם לערך הצפוי לפי מדידות התאים. זה אינו שם נוסף לתקלת בידוד.</p></article>
      <article><code>BMS_a079</code><h4>הגבלת יכולת הטעינה</h4><p>מצב פנימי בסוללה שמגביל טעינה; המדריך מתאר רף של 50%. הסיפור בקוריאה אינו הוכחה לאותו כשל של מארז BYD.</p></article>
    </div>
    <div className="safety-callout"><Icon name="info" size={23} /><p><strong>מופיעה התראה ברכב? היא קודמת לתוצאה באתר.</strong> פעלו לפי הוראות הרכב ופנו לטסלה או לסיוע בדרך לפי הצורך. המשיכו לפעול לפי המלצות הטעינה שמופיעות ברכב; לא הוכח ששינוי רף הטעינה מונע את התקלה המדווחת.</p></div>
  </section>
}
