import { assessmentTone } from './checker.ts'
import type { Assessment, Replacement } from './checker.ts'

export const BATTERY_EVIDENCE_LABELS = {
  unknown: 'לא נמסר מסמך',
  'replacement-invoice': 'החלפה לפי חשבונית או סיכום תיקון',
  'replacement-tesla': 'החלפה לפי אישור בכתב מטסלה',
  'other-tesla': 'מארז אחר לפי אישור בכתב מטסלה',
  'other-invoice': 'מארז אחר לפי מסמך שירות עם זיהוי המארז',
  'other-label': 'מארז אחר לפי מספר חלק שזוהה ואומת',
}
export type BatteryEvidence = keyof typeof BATTERY_EVIDENCE_LABELS

export function isBatteryEvidence(value: unknown): value is BatteryEvidence {
  return typeof value === 'string' && Object.hasOwn(BATTERY_EVIDENCE_LABELS, value)
}

export function batteryPresentation(result: Assessment, replacement: Replacement, evidence: BatteryEvidence = 'unknown') {
  const differentPack = evidence.startsWith('other-')
  const updated = replacement === 'yes' || differentPack
  return {
    tone: updated ? 'updated' as const : assessmentTone(result.status),
    updated,
    title: differentPack ? 'דווח על מארז אחר שמותקן ברכב'
      : evidence !== 'unknown' ? 'דווח על החלפת סוללה עם מסמך'
      : 'דווח על החלפת סוללה',
    detail: differentPack
      ? 'לפי המסמך שצוין, המארז המותקן אינו מארז BYD שבמוקד הבדיקה. ההתאמה לדגם המקורי נשארת מוצגת בנפרד.'
      : 'דווח שהסוללה הוחלפה. ההתאמה למטה מתייחסת לדגם המקורי, ולא קובעת מהו המארז החלופי או אם התקלה נפתרה.',
    evidenceLabel: BATTERY_EVIDENCE_LABELS[evidence],
  }
}
