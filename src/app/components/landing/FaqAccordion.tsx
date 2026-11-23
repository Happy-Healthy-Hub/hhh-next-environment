export interface FaqItem {
  question: string;
  answer: string;
}

/** Native disclosure controls remain usable before hydration and expose
 * their open/closed state correctly to assistive technology. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="hhh-land-faq">
      {items.map((item, index) => (
        <details className="hhh-land-faq__item" key={item.question} open={index === 0}>
          <summary className="hhh-land-faq__question">
            <span>{item.question}</span>
            <span className="hhh-land-faq__icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 1v10M1 6h10" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="hhh-land-faq__panel">
            <p className="hhh-land-faq__answer">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
