import { ACTIVE_SOURCE_URL } from './govil.ts'
import { HISTORY_SOURCE_URL } from './history.ts'
import { RECALL_SOURCE_URL } from './recalls.ts'

export const SITE_URL = 'https://testmatesla.com/'

export const FAQS = [
  {
    id: 'plate-or-vin',
    question: 'איך בודקים טסלה לפי מספר רישוי או VIN?',
    answer: 'מזינים מספר רישוי ישראלי כדי לשלוף פרטי רישום, ריקולים והיסטוריה זמינה ממאגרי משרד התחבורה. אפשר גם להזין מספר שלדה (VIN) בן 17 תווים לפענוח מקומי של מאפייני הרכב. בדיקת VIN בלבד אינה שולפת ריקולים, בעלויות או קילומטראז׳ מהמאגר הישראלי. השימוש חינם וללא הרשמה.',
    source: { label: 'מאגר הרישוי של משרד התחבורה', url: ACTIVE_SOURCE_URL },
  },
  {
    id: 'byd-identification',
    question: 'האם אפשר לזהות סוללת BYD בטסלה Model Y לפי VIN?',
    answer: 'VIN יכול לסייע בזיהוי מאפייני הייצור, אך אינו מספיק כדי לזהות בוודאות את ספק הסוללה או את המארז המותקן כיום. קידומת XP7 מצביעה על ברלין, לא על BYD לבדה. קוד Y7CR בתעודת התאימות (CoC) תומך בזיהוי התצורה המקורית שנחקרה. לאחר החלפת סוללה דרושים מסמכי שירות או זיהוי המארז המותקן; מספר השלדה אינו משתנה בגלל ההחלפה.',
    source: { label: 'המחקר והמקורות לזיהוי הסוללה', url: '#sources' },
  },
  {
    id: 'battery-profile',
    question: 'מה המשמעות של התאמה לקבוצת סוללות ה־Model Y?',
    answer: 'האתר משווה ארבעה מאפיינים לקבוצה שבמוקד דיווחי הכשל: Model Y, ייצור בברלין, שנת ייצור 2023–2024 והנעה אחורית (RWD). התאמה של 4 מתוך 4 היא ספירת מאפיינים, לא הסתברות לתקלה ולא אבחון של הסוללה. אין בידינו טווח VIN מאומת של אצווה פגומה. גם תוצאה מחוץ לקבוצה אינה אישור לתקינות הרכב.',
    source: { label: 'מה ידוע על דיווחי הסוללה ומה עדיין לא', url: '#battery-story' },
  },
  {
    id: 'israeli-year',
    question: 'איזו שנת ייצור משמשת לבדיקה אם שנת ה־VIN שונה?',
    answer: 'כאשר קיימת שנת ייצור במאגר הרישוי הישראלי, היא משמשת להצגה ולהשוואת מאפייני הרכב. השנה המפוענחת מה־VIN משמשת רק כאשר שנת הייצור במאגר חסרה. מועד העלייה לכביש הוא נתון נפרד. שנת 2024 היא סוף חלון המחקר המרכזי, לא תאריך מאומת שמפריד בין סוללות תקולות לתקינות.',
    source: { label: 'מקור שנת הייצור ברישום הישראלי', url: ACTIVE_SOURCE_URL },
  },
  {
    id: 'recall-meaning',
    question: 'מה בודקת בדיקת הריקולים לטסלה בישראל?',
    answer: 'הבדיקה מציגה רשומות הזמינות במאגר משרד התחבורה לכלי רכב שלא ביצעו ריקול. אם לא נמצאה רשומה, אין פירוש הדבר שאין תקלות, פעולות שירות אחרות או קריאה חדשה שטרם הופיעה במאגר. בירור מול טסלה משלים את המידע. תוצאת הריקולים נפרדת מהשוואת מאפייני הסוללה.',
    source: { label: 'מאגר כלי רכב שלא ביצעו ריקול', url: RECALL_SOURCE_URL },
  },
  {
    id: 'ownership-mileage',
    question: 'האם אפשר לראות בעלים קודמים וקילומטראז׳ בכל שנה?',
    answer: 'האתר מציג תאריכים וסוגי בעלות שפורסמו במאגר, לא שמות או פרטים אישיים של בעלים קודמים. מספר הרשומות אינו בהכרח מספר היד הרשמי. מקור הקילומטראז׳ מספק את הקריאה המצטברת האחרונה שזמינה בו, לא סדרה שנתית. נתון חסר אינו אפס קילומטרים, ודגלי שינוי ברישום אינם דוח תאונות.',
    source: { label: 'מאגרי היסטוריית כלי רכב', url: HISTORY_SOURCE_URL },
  },
  {
    id: 'lookup-privacy',
    question: 'האם TestMaTesla שומר מספרי רישוי או מספרי שלדה?',
    answer: 'אין באתר מאגר חיפושי רכב. פענוח VIN נעשה בדפדפן; בחיפוש לפי רישוי הדפדפן שולח את המספר ישירות למשרד התחבורה. מדידת שימוש ב־Google Analytics מופעלת רק בהסכמה ואינה כוללת מזהי רכב. ספקי תשתית עשויים לשמור רישומי בקשות טכניים, וקובץ או קישור ששיתפתם עשויים להישמר אצל הנמען. הפרטים המלאים מופיעים בהצהרת הפרטיות.',
    source: { label: 'הצהרת הפרטיות המלאה', url: '#privacy' },
  },
] as const

export const PUBLIC_CONTENT_HASHES = ['#privacy', '#accessibility', '#faq', '#battery-story', '#sources', ...FAQS.map(item => `#${item.id}`)]

export const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: 'TestMaTesla',
      url: SITE_URL,
      logo: `${SITE_URL}apple-touch-icon.png`,
      description: 'פרויקט עצמאי למידע על רכבי טסלה בישראל, ללא שיוך לטסלה או ל־BYD.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      url: SITE_URL,
      name: 'TestMaTesla',
      inLanguage: 'he-IL',
      publisher: { '@id': `${SITE_URL}#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}#application`,
      url: SITE_URL,
      name: 'TestMaTesla',
      inLanguage: 'he-IL',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript is required for vehicle lookups.',
      description: 'בדיקת טסלה לפי מספר רישוי ישראלי או VIN: מאפייני סוללה, ריקולים, בעלויות וקריאת קילומטראז׳ זמינה. התאמה לקבוצת דגם אינה אבחון תקלה.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
      publisher: { '@id': `${SITE_URL}#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}#faq`,
      url: `${SITE_URL}#faq`,
      inLanguage: 'he-IL',
      isPartOf: { '@id': `${SITE_URL}#website` },
      mainEntity: FAQS.map(item => ({
        '@type': 'Question',
        '@id': `${SITE_URL}#${item.id}`,
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ],
}
