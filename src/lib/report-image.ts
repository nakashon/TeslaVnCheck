import QRCode from 'qrcode'
import { assess } from './checker.ts'
import { batteryPresentation } from './battery-presentation.ts'
import type { SharedReport } from './share.ts'
import { BRAND_MARK, SLOGAN } from './branding.ts'

export async function renderReportImage(report: SharedReport, link: string): Promise<Blob> {
  const logo = new Image()
  logo.src = `${import.meta.env.BASE_URL}${BRAND_MARK}`
  await logo.decode()
  const result = assess(report.prefix + '000000', report.variant, report.replacement, report.registration)
  const presentation = batteryPresentation(result, report.replacement, report.batteryEvidence)
  const tone = presentation.tone
  const color = { attention: '#bb253b', clear: '#14764c', uncertain: '#a45e06', updated: '#3155a6' }[tone]
  const background = { attention: '#fff0f2', clear: '#ecf8f1', uncertain: '#fff7e7', updated: '#edf2ff' }[tone]
  const titles = {
    candidate: 'תואם לקבוצת הדגם המדווחת',
    'document-supported': 'תצורת BYD נתמכת בפרטים שהוזנו',
    outside: 'מחוץ לקבוצת הדגם שנבדקת',
    conflicting: 'יש סתירה בפרטים — נדרש בירור',
    unknown: 'נדרש מידע נוסף לזיהוי',
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1380
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas_unavailable')
  const text = (value: string, x: number, y: number, size: number, fill: string, bold = false) => {
    context.fillStyle = fill
    context.font = `${bold ? 700 : 400} ${size}px Arial, sans-serif`
    context.fillText(value, x, y)
  }
  context.fillStyle = '#f5f5f7'
  context.fillRect(0, 0, 1080, 1380)
  context.direction = 'ltr'
  context.textAlign = 'left'
  context.drawImage(logo, 64, 46, 68, 68)
  text('TestMaTesla', 149, 95, 53, '#191b22', true)
  context.direction = 'rtl'
  context.textAlign = 'right'
  text(SLOGAN, 1016, 139, 25, '#666b77')
  text('דוח זיהוי רכב', 1016, 198, 32, '#666b77')
  text(result.decoded.model ?? 'Tesla', 1016, 267, 58, '#191b22', true)
  const factory = ({ Berlin: 'ברלין', Shanghai: 'שנגחאי', Fremont: 'פרימונט', Austin: 'אוסטין' }[result.decoded.factory ?? '']) ?? 'מפעל לא ידוע'
  text(`${factory}  ·  ${result.profileYear ?? 'שנה לא ידועה'}`, 1016, 322, 31, '#666b77')
  context.fillStyle = background
  context.fillRect(64, 367, 952, 330)
  context.fillStyle = color
  context.fillRect(1008, 367, 8, 330)
  text(presentation.updated ? presentation.title : titles[result.status], 960, 440, 37, color, true)
  context.direction = 'ltr'
  context.textAlign = 'left'
  text(`${result.profileMatch.matched} / ${result.profileMatch.total}`, 113, 567, 94, color, true)
  context.direction = 'rtl'
  context.textAlign = 'right'
  text(presentation.updated ? 'מאפייני הדגם המקורי תואמים' : 'מאפייני הדגם תואמים', 960, 554, 30, '#252832', true)
  text(presentation.updated && result.status === 'conflicting' ? 'נתוני הדגם סותרים — נדרש בירור נפרד' : 'ספירת מאפיינים, לא אחוז סיכון לתקלה', 960, 647, 26, '#666b77')
  text(presentation.updated ? `הבסיס שצוין: ${presentation.evidenceLabel}` : `זהות הסוללה: ${report.variant === 'Y7CR' ? 'קוד Y7CR נמסר על ידי המשתף' : 'נדרש מסמך זיהוי סוללה'}`, 1016, 765, 28, '#252832')
  text(presentation.updated ? report.batteryEvidence?.startsWith('other-') ? 'לפי הדיווח: המארז הנוכחי אינו מארז BYD שבמוקד.' : 'החלפה אינה קובעת את זהות המארז או פתרון התקלה.' : `החלפת סוללה: ${report.replacement === 'no' ? 'המשתף ציין שהמארז מקורי' : 'לא נמסר מידע'}`, 1016, 814, 26, '#666b77')
  const recallText = report.recall
    ? `ריקולים במועד הבדיקה: ${report.recall.count}${report.recall.truncated ? '+ (מידע חלקי)' : ' שנמצאו במאגר'}`
    : 'ריקולים: לא נכללה בדיקה בדוח'
  text(recallText, 1016, 873, 28, '#252832')
  text(`נוצר ב־${new Date(report.createdAt).toLocaleDateString('he-IL')}`, 1016, 925, 25, '#666b77')
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, link, { width: 240, margin: 4, errorCorrectionLevel: 'M' })
  context.drawImage(qr, 64, 981)
  text('ומה עם הטסלה שלכם?', 1016, 1042, 39, '#191b22', true)
  text('סרקו לצפייה בדוח ולבדיקת הרכב שלכם.', 1016, 1099, 29, '#666b77')
  text('מספר הרישוי והמספר הסידורי של ה-VIN אינם משותפים.', 1016, 1249, 25, '#666b77')
  text(presentation.updated ? 'דיווח משתמש; המסמך לא נבדק באתר. אינו אישור תקינות.' : 'סיכום ששיתף משתמש. אינו תעודת תקינות או אימות של טסלה.', 1016, 1297, 25, '#666b77')
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image_export_failed')), 'image/png'))
}
