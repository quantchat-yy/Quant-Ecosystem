import React, { useState } from 'react';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

const PRODUCT_LINKS: FooterLink[] = [
  { label: 'QuantMail', href: '/apps/mail' },
  { label: 'QuantChat', href: '/apps/chat' },
  { label: 'QuantDrive', href: '/apps/drive' },
  { label: 'QuantDocs', href: '/apps/docs' },
  { label: 'QuantCalendar', href: '/apps/calendar' },
  { label: 'QuantMeet', href: '/apps/meet' },
  { label: 'QuantAI', href: '/apps/ai' },
  { label: 'QuantSync', href: '/apps/sync' },
  { label: 'QuantNeon', href: '/apps/neon' },
  { label: 'QuantEdits', href: '/apps/edits' },
  { label: 'QuantMax', href: '/apps/max' },
  { label: 'QuantTube', href: '/apps/tube' },
  { label: 'QuantAds', href: '/apps/ads' },
];

const COMPANY_LINKS: FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'Blog', href: '/blog' },
  { label: 'Press', href: '/press' },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'GDPR', href: '/gdpr' },
  { label: 'Security', href: '/security' },
];

interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Twitter', href: 'https://twitter.com/quantapp', icon: 'T' },
  { label: 'GitHub', href: 'https://github.com/quant', icon: 'G' },
  { label: 'Discord', href: 'https://discord.gg/quant', icon: 'D' },
  { label: 'YouTube', href: 'https://youtube.com/@quant', icon: 'Y' },
];

const FOOTER_SECTIONS: FooterSection[] = [
  { title: 'Product', links: PRODUCT_LINKS },
  { title: 'Company', links: COMPANY_LINKS },
  { title: 'Legal', links: LEGAL_LINKS },
];

export function Footer(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="footer">
      <div className="footer-sections">
        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title} className="footer-section">
            <h3 className="footer-section__title">{section.title}</h3>
            <ul className="footer-section__list">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="footer-section__link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Connect column */}
        <div className="footer-section footer-section--connect">
          <h3 className="footer-section__title">Connect</h3>
          <div className="footer-social">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="footer-social__link"
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="footer-social__icon" aria-hidden="true">
                  {social.icon}
                </span>
              </a>
            ))}
          </div>

          {/* Newsletter signup */}
          <div className="footer-newsletter">
            <h4 className="footer-newsletter__title">Stay Updated</h4>
            {subscribed ? (
              <p className="footer-newsletter__success">Thanks for subscribing!</p>
            ) : (
              <form className="footer-newsletter__form" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  className="footer-newsletter__input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email for newsletter"
                  required
                />
                <button type="submit" className="footer-newsletter__btn">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-bottom__copyright">
          &copy; {new Date().getFullYear()} Quant. All rights reserved.
        </p>
        <p className="footer-bottom__tagline">Privacy-first, local-first productivity.</p>
      </div>
    </footer>
  );
}
