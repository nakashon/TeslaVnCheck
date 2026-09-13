import { SLOGAN } from './branding.ts'

export const CAMPAIGN_VALUES = {
  utm_source: ['facebook', 'instagram', 'whatsapp', 'telegram', 'google', 'tiktok', 'youtube', 'linkedin', 'x', 'newsletter', 'shared_report'],
  utm_medium: ['paid_social', 'social', 'cpc', 'referral', 'email', 'qr'],
  utm_campaign: ['launch', 'battery-awareness', 'model-y', 'owners', 'used-tesla', 'report-share'],
  utm_content: ['post', 'story', 'reel', 'group', 'ad-a', 'ad-b', 'qr'],
}

const campaignFields = {
  utm_source: 'campaign_source', utm_medium: 'campaign_medium',
  utm_campaign: 'campaign_name', utm_content: 'campaign_content',
}
const referralHosts = new Set([
  'google.com', 'www.google.com', 'google.co.il', 'www.google.co.il',
  'bing.com', 'www.bing.com', 'duckduckgo.com', 'www.duckduckgo.com',
  'chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'www.perplexity.ai',
  'copilot.microsoft.com', 'claude.ai', 'gemini.google.com',
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com',
  'instagram.com', 'www.instagram.com', 'l.instagram.com', 't.me',
  'youtube.com', 'www.youtube.com', 'youtu.be', 'linkedin.com', 'www.linkedin.com',
  't.co', 'x.com', 'www.tiktok.com',
])
export const ANALYTICS_EVENTS = [
  'page_view', 'shared_report_opened', 'vehicle_lookup_started', 'vehicle_lookup_completed',
  'vehicle_lookup_failed', 'report_generated', 'report_generation_failed', 'report_shared',
  'report_link_copied', 'report_download_clicked', 'coc_request_copied',
] as const
export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number]
export type AnalyticsDetail = { lookup_method?: 'plate' | 'vin'; method?: 'file' | 'link' }

export function analyticsContext(search: string, referrer: string): Record<string, string> {
  const context: Record<string, string> = {
    page_location: 'https://testmatesla.com/',
    page_title: `TestMaTesla — ${SLOGAN}`,
    page_referrer: '',
  }
  const query = new URLSearchParams(search)
  for (const key of Object.keys(CAMPAIGN_VALUES) as (keyof typeof CAMPAIGN_VALUES)[]) {
    const value = query.get(key)
    if (value && query.getAll(key).length === 1 && CAMPAIGN_VALUES[key].includes(value)) {
      context[campaignFields[key]] = value
    }
  }
  if (referrer) {
    try {
      const url = new URL(referrer)
      if (url.protocol === 'https:' && !url.username && !url.password && !url.port && referralHosts.has(url.hostname)) {
        context.page_referrer = url.origin + '/'
      }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error
    }
  }
  return context
}

export function analyticsEventDetail(event: AnalyticsEvent, detail: AnalyticsDetail = {}): Record<string, string> {
  const result: Record<string, string> = {}
  if (event.startsWith('vehicle_lookup_') && (detail.lookup_method === 'plate' || detail.lookup_method === 'vin')) {
    result.lookup_method = detail.lookup_method
  }
  if (event === 'report_shared' && (detail.method === 'file' || detail.method === 'link')) result.method = detail.method
  return result
}

export function tagReportLink(url: URL): void {
  url.search = ''
  url.searchParams.set('utm_source', 'shared_report')
  url.searchParams.set('utm_medium', 'referral')
  url.searchParams.set('utm_campaign', 'report-share')
}
