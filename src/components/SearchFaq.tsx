import { FAQS } from '../lib/seo.ts'

export function SearchFaq() {
  return <section className="search-faq" id="faq" aria-labelledby="faq-title" tabIndex={-1}>
    <div className="section-heading"><div><span className="eyebrow">לפני שבודקים ולפני שקונים</span><h2 id="faq-title">שאלות על בדיקת טסלה בישראל</h2></div></div>
    <p>מה אפשר ללמוד ממספר הרישוי, מה דורש מסמך, ומה התוצאה אינה אומרת.</p>
    {FAQS.map(item => <details key={item.id} id={item.id} tabIndex={-1}>
      <summary>{item.question}</summary>
      <p>{item.answer}</p>
      <a href={item.source.url}>{item.source.label}</a>
    </details>)}
  </section>
}
