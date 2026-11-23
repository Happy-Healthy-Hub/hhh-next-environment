import Image from 'next/image';
import { connection } from 'next/server';
import { LandingNav } from './components/landing/LandingNav';
import { ScrollReveal } from './components/landing/ScrollReveal';
import { FaqAccordion } from './components/landing/FaqAccordion';
import './landing.css';
import './registration.css';

const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Happy Healthy Hub',
  alternateName: 'Silverage Care Services',
  url: 'https://hhh.foundation',
  logo: 'https://hhh.foundation/images/hhh-logo.webp',
  telephone: '+91-7507674555',
  areaServed: [
    { '@type': 'City', name: 'Pune' },
    { '@type': 'City', name: 'Delhi' },
  ],
};

const SERVICES = [
  {
    name: 'Home-care assistance',
    desc: 'Day-to-day support at home so everyday tasks feel manageable, not overwhelming.',
    icon: HomeIcon,
  },
  {
    name: 'Personal-care support',
    desc: 'Respectful, dignified help with personal routines, delivered by a trained care associate.',
    icon: HeartIcon,
  },
  {
    name: 'Companionship',
    desc: 'Genuine conversation and company — because care is also about connection, not only tasks.',
    icon: UsersIcon,
  },
  {
    name: 'Meal preparation',
    desc: 'Thoughtful help with everyday meals, fitted around personal preference and routine.',
    icon: MealIcon,
  },
  {
    name: 'Overnight care',
    desc: 'Reassurance and support through the night, for families who want continuity of care.',
    icon: MoonIcon,
  },
  {
    name: 'Family communication',
    desc: 'Clear, honest updates so families stay informed and reassured, wherever they are.',
    icon: ChatIcon,
  },
];

const WHY_HHH = [
  {
    title: 'Dignity-first care',
    body: 'Every interaction starts from respect for the person, not just the task in front of us.',
  },
  {
    title: 'Personalised support',
    body: 'Care is shaped around the individual — their routine, their preferences, their pace.',
  },
  {
    title: 'Trained care associates',
    body: 'People who understand that responsibility and compassion go hand in hand.',
  },
  {
    title: 'Honest family communication',
    body: 'Families are kept informed, not left guessing — clarity is part of the care itself.',
  },
];

const STEPS = [
  {
    title: 'Connect with us',
    body: 'Learn about the available services and share what kind of support is needed.',
  },
  {
    title: 'Understand your needs',
    body: 'Our care team reviews the requirements and the details that matter most.',
  },
  {
    title: 'Plan the support',
    body: 'Appropriate services and arrangements are discussed and agreed together.',
  },
  {
    title: 'Stay connected',
    body: 'Families and customers remain informed through our ongoing care communication.',
  },
];

const FAQS = [
  {
    question: 'What is Happy Healthy Hub?',
    answer:
      'Happy Healthy Hub is a care-services organisation under our Silverage Care Services banner, supporting older adults and their families with thoughtful, home-based care and companionship.',
  },
  {
    question: 'Which care services does HHH provide?',
    answer:
      'Our care is built around home-care assistance, personal-care support, companionship, meal preparation, overnight care and ongoing family communication. See "Our Services" above for a short description of each.',
  },
  {
    question: 'Which cities does HHH currently serve?',
    answer: 'We currently serve Pune and Delhi. We have not yet expanded to other cities.',
  },
  {
    question: 'How can families enquire about care services?',
    answer:
      'Reach out through the contact details in our footer, and a member of our care team will follow up to understand your needs.',
  },
  {
    question: 'Can family members stay informed about care arrangements?',
    answer:
      'Yes — clear, honest communication with families is part of how we work, not an afterthought.',
  },
  {
    question: 'What is the Happy Healthy Caregiver Academy?',
    answer:
      'The Happy Healthy Caregiver Academy is our initiative to prepare people for responsible, compassionate care work. We are not publishing course details, fees or eligibility criteria yet — enquire through our contact channel and our team will share what is currently available.',
  },
  {
    question: 'How can someone enquire about becoming a caregiver?',
    answer:
      'Use the same contact channel in our footer and let us know you are interested in care work or the Caregiver Academy; our team will get back to you.',
  },
  {
    question: 'How can I contact Happy Healthy Hub?',
    answer: 'The quickest way is through the contact details listed in the footer of this page.',
  },
];

/**
 * Happy Healthy Hub public landing page -- a standalone extraction of the
 * marketing/brand page that also lives inside the Operations Portal
 * repository. No fabricated testimonials, statistics, certifications,
 * prices or availability claims appear -- content follows the same
 * "do not invent" rule as the source project.
 */
export default async function LandingPage() {
  await connection();
  return (
    <div className="hhh-land" id="top">
      <a className="hhh-skip-link" href="#main-content">Skip to main content</a>
      <LandingNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
      />

      <main id="main-content">
        {/* ---------------------------------------------------------- Hero */}
        <header className="hhh-land-hero">
        <div className="hhh-land__container hhh-land-hero__grid">
          <div>
            <p className="hhh-land__eyebrow">Happy Healthy Hub · Silverage Care Services</p>
            <h1 className="hhh-land-hero__heading">Care that honours a lifetime.</h1>
            <p className="hhh-land-hero__sub">
              Thoughtful care, meaningful companionship and dependable support — helping older
              adults live with dignity, comfort and connection.
            </p>
            <div className="hhh-land-hero__actions">
              <a href="#services" className="hhh-land-btn hhh-land-btn--primary">
                Explore Our Services
              </a>
              <a href="#approach" className="hhh-land-btn hhh-land-btn--ghost">
                Discover Our Approach
              </a>
            </div>
          </div>
          <div className="hhh-land-hero__media">
            <div className="hhh-land-hero__frame">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export uses a hand-generated responsive WebP srcset. */}
              <img
                src="/images/hhh-hero.webp"
                srcSet="/images/hhh-hero-480.webp 480w, /images/hhh-hero-800.webp 800w, /images/hhh-hero.webp 1199w"
                alt="An older adult and family member speaking with a care professional, with the message: A real conversation, not a transaction."
                width={1199}
                height={1312}
                sizes="(max-width: 900px) 100vw, 44vw"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="hhh-land-hero__illustration"
              />
            </div>
          </div>
        </div>
        </header>

      {/* ------------------------------------------------- Trust / intro */}
      <section className="hhh-land-section" id="about" aria-labelledby="about-heading">
        <div className="hhh-land__container hhh-land-trust">
          <ScrollReveal>
            <div className="hhh-land-trust__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export uses a hand-generated responsive WebP srcset. */}
              <img
                src="/images/hhh-companionship.webp"
                srcSet="/images/hhh-companionship-480.webp 480w, /images/hhh-companionship-800.webp 800w, /images/hhh-companionship.webp 1000w"
                alt="A care professional greeting an older adult seated on a park bench"
                width={1000}
                height={1272}
                sizes="(max-width: 860px) 100vw, 38vw"
                loading="lazy"
                decoding="async"
                className="hhh-land-trust__illustration"
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div>
              <p className="hhh-land__eyebrow">Who we are</p>
              <h2 id="about-heading" className="hhh-land-section__heading">
                A little more care. A lot more confidence.
              </h2>
              <p className="hhh-land-section__sub">
                Happy Healthy Hub is committed to supporting older adults through thoughtful care
                services, companionship and dependable assistance, while helping families feel
                more connected and reassured.
              </p>
              <div className="hhh-land-trust__stats">
                <div>
                  <div className="hhh-land-trust__stat-value">2</div>
                  <div className="hhh-land-trust__stat-label">Cities served today — Pune &amp; Delhi</div>
                </div>
                <div>
                  <div className="hhh-land-trust__stat-value">1:1</div>
                  <div className="hhh-land-trust__stat-label">Personalised, individual care</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------ Services */}
      <section className="hhh-land-section hhh-land-section--tint" id="services" aria-labelledby="services-heading">
        <div className="hhh-land__container">
          <ScrollReveal className="hhh-land-section__head hhh-land-section__head--center">
            <p className="hhh-land__eyebrow">Our care services</p>
            <h2 id="services-heading" className="hhh-land-section__heading">
              Support shaped around real, everyday needs.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div className="hhh-land-services__list">
              {SERVICES.map((service, index) => (
                <div className="hhh-land-service-row" key={service.name}>
                  <span className="hhh-land-service-row__icon" aria-hidden="true">
                    <service.icon />
                  </span>
                  <div>
                    <h3 className="hhh-land-service-row__name">{service.name}</h3>
                    <p className="hhh-land-service-row__desc">{service.desc}</p>
                  </div>
                  <span className="hhh-land-service-row__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------ Why HHH */}
      <section className="hhh-land-section" aria-labelledby="why-heading">
        <div className="hhh-land__container hhh-land-why">
          <ScrollReveal>
            <div>
              <p className="hhh-land__eyebrow">Why Happy Healthy Hub</p>
              <h2 id="why-heading" className="hhh-land-section__heading">
                Care is more than assistance. It is understanding.
              </h2>
              <p className="hhh-land-section__sub">
                Our approach is built on a few principles we hold to consistently, not a long list
                of promises.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="hhh-land-why__statements">
              {WHY_HHH.map((item) => (
                <div className="hhh-land-why__item" key={item.title}>
                  <h3 className="hhh-land-why__item-title">{item.title}</h3>
                  <p className="hhh-land-why__item-body">{item.body}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------- How it works */}
      <section className="hhh-land-section hhh-land-section--tint" aria-labelledby="how-heading">
        <div className="hhh-land__container">
          <ScrollReveal className="hhh-land-section__head hhh-land-section__head--center">
            <p className="hhh-land__eyebrow">How it works</p>
            <h2 id="how-heading" className="hhh-land-section__heading">
              A simple, reassuring path to support.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div className="hhh-land-steps">
              {STEPS.map((step, index) => (
                <div className="hhh-land-step" key={step.title}>
                  <div className="hhh-land-step__num" aria-hidden="true">{index + 1}</div>
                  <h3 className="hhh-land-step__title">{step.title}</h3>
                  <p className="hhh-land-step__body">{step.body}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------- Academy */}
      <section className="hhh-land-section" id="academy" aria-labelledby="academy-heading">
        <div className="hhh-land__container hhh-land-academy">
          <ScrollReveal>
            <div>
              <p className="hhh-land__eyebrow">Happy Healthy Caregiver Academy</p>
              <h2 id="academy-heading" className="hhh-land-section__heading">
                Building better care, one caregiver at a time.
              </h2>
              <p className="hhh-land-section__sub">
                Care begins with people who understand the importance of compassion,
                responsibility and dignity.
              </p>
              <ul className="hhh-land-academy__list">
                <li>
                  <CheckIcon /> Practical, hands-on learning for responsible care work.
                </li>
                <li>
                  <CheckIcon /> Preparing individuals to deliver care with genuine professionalism.
                </li>
                <li>
                  <CheckIcon /> Built on the same dignity-first principles as our care services.
                </li>
              </ul>
              <a href="#contact" className="hhh-land-btn hhh-land-btn--primary">
                Enquire about the Caregiver Academy
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="hhh-land-academy__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export uses a hand-generated responsive WebP srcset. */}
              <img
                src="/images/hhh-academy.webp"
                srcSet="/images/hhh-academy-480.webp 480w, /images/hhh-academy-800.webp 800w, /images/hhh-academy.webp 1200w"
                alt="Two Happy Healthy Hub team members reviewing a caregiver training checklist"
                width={1200}
                height={956}
                sizes="(max-width: 860px) 100vw, 42vw"
                loading="lazy"
                decoding="async"
                className="hhh-land-academy__illustration"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------ Approach */}
      <section className="hhh-land-section" id="approach" aria-labelledby="approach-heading">
        <div className="hhh-land__container">
          <ScrollReveal>
            <div className="hhh-land-approach hhh-land-approach--text-only">
              <div className="hhh-land-approach__content">
                <p className="hhh-land__eyebrow" style={{ color: 'var(--hhh-soft-peach)' }}>
                  Our approach to care
                </p>
                <h2 className="hhh-land-approach__quote" id="approach-heading">
                  &ldquo;Every person deserves dignity, and support should never come at the cost
                  of independence.&rdquo;
                </h2>
                <ul className="hhh-land-approach__list">
                  <li>Care should respect independence, not replace it.</li>
                  <li>Companionship matters as much as assistance.</li>
                  <li>Families deserve clear, honest communication.</li>
                  <li>Support should be thoughtful, consistent and dependable.</li>
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ FAQ */}
      <section className="hhh-land-section" id="faq" aria-labelledby="faq-heading">
        <div className="hhh-land__container">
          <ScrollReveal className="hhh-land-section__head hhh-land-section__head--center">
            <p className="hhh-land__eyebrow">Frequently asked questions</p>
            <h2 id="faq-heading" className="hhh-land-section__heading">
              Good to know before you reach out.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <FaqAccordion items={FAQS} />
          </ScrollReveal>
        </div>
      </section>

      {/* -------------------------------------------------------- Final CTA */}
      <section className="hhh-land-section" aria-labelledby="cta-heading">
        <div className="hhh-land__container">
          <ScrollReveal>
            <div className="hhh-land-cta">
              <h2 className="hhh-land-cta__heading" id="cta-heading">
                A more supported tomorrow starts with a conversation.
              </h2>
              <p className="hhh-land-cta__sub">
                Whether you are exploring care for someone you love or looking to become part of a
                caring community, Happy Healthy Hub is here to help you take the next step.
              </p>
              <div className="hhh-land-cta__actions">
                <a href="#services" className="hhh-land-btn hhh-land-btn--primary">
                  Explore Care Services
                </a>
                <a href="#academy" className="hhh-land-btn hhh-land-btn--ghost">
                  Discover the Caregiver Academy
                </a>
                <a href="#contact" className="hhh-land-btn hhh-land-btn--ghost">
                  Contact Us
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
      </main>

      {/* ------------------------------------------------------------ Footer */}
      <footer className="hhh-land-footer" id="contact">
        <div className="hhh-land__container">
          <div className="hhh-land-footer__top">
            <div className="hhh-land-footer__brand">
              <Image src="/images/hhh-logo.webp" alt="" width={80} height={80} loading="lazy" />
              <div>
                <div className="hhh-land-footer__brand-name">Happy Healthy Hub</div>
                <div className="hhh-land-footer__brand-tag">Silverage Care Services</div>
              </div>
            </div>
            <div className="hhh-land-footer__links">
              <div>
                <p className="hhh-land-footer__col-title">Explore</p>
                <ul className="hhh-land-footer__col">
                  <li><a href="#about">About</a></li>
                  <li><a href="#services">Our Services</a></li>
                  <li><a href="#academy">Caregiver Academy</a></li>
                  <li><a href="#faq">FAQs</a></li>
                </ul>
              </div>
              <div>
                <p className="hhh-land-footer__col-title">Where we are</p>
                <ul className="hhh-land-footer__col">
                  <li><span>Pune</span></li>
                  <li><span>Delhi</span></li>
                </ul>
              </div>
              <div>
                <p className="hhh-land-footer__col-title">HHH - support and helpline</p>
                <ul className="hhh-land-footer__col">
                  <li><span>Happy Healthy Hub — Official Helpline</span></li>
                  <li><a href="tel:+917507674555">+91 7507674555</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="hhh-land-footer__bottom">
            <span>© {new Date().getFullYear()} Happy Healthy Hub. All rights reserved.</span>
            <a href="https://hhh.foundation">hhh.foundation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 20s-7-4.4-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6M16 8a3 3 0 1 1 0-.01M22 20c0-2.8-2.2-5.1-5-5.8" strokeLinecap="round" />
    </svg>
  );
}
function MealIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5 3v8M3 3v8a2 2 0 0 0 4 0V3M19 3c-2 0-3 2-3 5s1 4 3 4v9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12.5 9.5 18 20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
