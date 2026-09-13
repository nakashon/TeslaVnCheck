import { BRAND_MARK } from '../lib/branding.ts'

export function Brand({ footer = false }: { footer?: boolean }) {
  return <a href="#" className={`brand${footer ? ' footer-brand' : ''}`} aria-label="TestMaTesla — עמוד הבית">
    <img className="brand-mark" src={`${import.meta.env.BASE_URL}${BRAND_MARK}`} width={44} height={44} alt="" />
    <span dir="ltr">Test<span>Ma</span>Tesla</span>
  </a>
}
