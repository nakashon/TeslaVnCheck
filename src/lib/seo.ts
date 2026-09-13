import { ACTIVE_SOURCE_URL } from './govil.ts'
import { HISTORY_SOURCE_URL } from './history.ts'
import { RECALL_SOURCE_URL } from './recalls.ts'
import { RESEARCH_DATE, SOURCES } from './checker.ts'

export const SITE_URL = 'https://testmatesla.com/'
export const PROJECT = {
  name: 'TestMaTesla',
  url: SITE_URL,
  repository: 'https://github.com/nakashon/testmatesla',
  description: 'בדיקת טסלה לפי מספר רישוי ישראלי או VIN: מאפייני סוללה, ריקולים, בעלויות וקריאת קילומטראז׳ זמינה. התאמה לקבוצת דגם אינה אבחון תקלה.',
  creator: { name: 'Asaf Nakash', url: 'https://nakashon.com/', entityId: 'https://nakashon.com/#person' },
}

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
  {
    id: 'project-creator',
    question: 'מי עומד מאחורי TestMaTesla?',
    answer: `${PROJECT.name} הוא פרויקט עצמאי של ${PROJECT.creator.name}, שנועד לעזור לבעלי טסלה ולקונים בישראל להבין מידע זמין על הרכב. האתר אינו שירות של טסלה, BYD או משרד התחבורה ואינו פועל מטעמם. המקורות וההבחנה בין נתוני רישום, דיווחי בעלים ומסקנות הבדיקה מוצגים באתר.`,
    source: { label: 'הפרויקטים של Asaf Nakash', url: `${PROJECT.creator.url}#projects` },
  },
] as const

export const PUBLIC_CONTENT_HASHES = ['#privacy', '#accessibility', '#faq', '#battery-story', '#sources', ...FAQS.map(item => `#${item.id}`)]

export const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': PROJECT.creator.entityId,
      name: PROJECT.creator.name,
      url: PROJECT.creator.url,
    },
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
      description: PROJECT.description,
      creator: { '@id': PROJECT.creator.entityId },
      sameAs: [PROJECT.repository],
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

export const SITE_CANON = {
  version: 1,
  generatedFrom: SITE_URL,
  project: PROJECT,
  language: 'he-IL',
  researchBasisDate: RESEARCH_DATE,
  scope: 'Public website facts, not individual vehicle records or a verified defective-battery database.',
  questions: FAQS.map(item => ({
    id: item.id,
    url: `${SITE_URL}#${item.id}`,
    question: item.question,
    answer: item.answer,
    source: { label: item.source.label, url: new URL(item.source.url, SITE_URL).href },
  })),
  sources: SOURCES,
}

export function renderLlmsText(): string {
  return `# ${PROJECT.name}

> ${PROJECT.description}

## Public project facts

- Website: ${SITE_URL}
- Creator: ${PROJECT.creator.name} — ${PROJECT.creator.url}
- Source repository: ${PROJECT.repository}
- Interface language: Hebrew (Israel)
- Machine-readable facts: ${SITE_URL}canon.json
- Research basis date: ${RESEARCH_DATE}

This summary describes the public website, not a specific vehicle. It is not a
database of confirmed defective VINs. The answers below are generated from the
same content displayed to visitors, including its evidence and privacy limits.
The research basis date is not a claim that live vehicle data was checked today.

## Questions and answers

${SITE_CANON.questions.map(item => `### ${item.question}

${item.answer}

Page: ${item.url}
Source: [${item.source.label}](${item.source.url})`).join('\n\n')}

## Research sources and evidence types

${SOURCES.map(source => `- [${source.title.en}](${source.url}) — ${source.kind.en}`).join('\n')}

## Public pages

- [Vehicle information and methodology](${SITE_URL})
- [Battery research](${SITE_URL}#battery-story)
- [Sources](${SITE_URL}#sources)
- [Privacy](${SITE_URL}#privacy)
- [Accessibility](${SITE_URL}#accessibility)
`
}
