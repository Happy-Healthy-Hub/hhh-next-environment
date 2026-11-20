'use client';

import { useState } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

/** Accessible accordion: real <button> toggles, aria-expanded, a
 * grid-template-rows 0fr->1fr transition for the smooth height
 * animation (no JS height measurement needed), single-open-at-a-time. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="hhh-land-faq">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `hhh-faq-panel-${index}`;
        const buttonId = `hhh-faq-question-${index}`;
        return (
          <div className="hhh-land-faq__item" data-open={isOpen} key={item.question}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={buttonId}
                className="hhh-land-faq__question"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span>{item.question}</span>
                <span className="hhh-land-faq__icon" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6 1v10M1 6h10" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <div className="hhh-land-faq__panel" id={panelId} role="region" aria-labelledby={buttonId}>
              <div className="hhh-land-faq__panel-inner">
                <p className="hhh-land-faq__answer">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
