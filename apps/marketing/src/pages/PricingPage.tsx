import React, { useState } from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { PricingCard } from '../components/PricingCard.js';
import { CTASection } from '../components/CTASection.js';
import { ComparisonTable } from '../components/ComparisonTable.js';
import type { PricingFeature } from '../components/PricingCard.js';

export interface PricingPageProps {
  className?: string;
}

const FREE_FEATURES: PricingFeature[] = [
  { text: '5GB storage', included: true },
  { text: 'All 13 apps', included: true },
  { text: 'End-to-end encryption', included: true },
  { text: 'Basic AI features', included: true },
  { text: '3 collaborators per document', included: true },
  { text: 'Community support', included: true },
  { text: 'Advanced AI', included: false },
  { text: 'Priority support', included: false },
];

const PRO_FEATURES: PricingFeature[] = [
  { text: '100GB storage', included: true },
  { text: 'All 13 apps', included: true },
  { text: 'End-to-end encryption', included: true },
  { text: 'Advanced AI features', included: true },
  { text: 'Unlimited collaborators', included: true },
  { text: 'Priority support', included: true },
  { text: 'Custom integrations', included: true },
  { text: 'Admin dashboard', included: true },
];

const ENTERPRISE_FEATURES: PricingFeature[] = [
  { text: 'Unlimited storage', included: true },
  { text: 'All 13 apps', included: true },
  { text: 'End-to-end encryption', included: true },
  { text: 'Advanced AI features', included: true },
  { text: 'Unlimited collaborators', included: true },
  { text: 'Dedicated support + SLA', included: true },
  { text: 'Custom integrations', included: true },
  { text: 'SSO/SAML, audit logs, DLP', included: true },
  { text: 'On-premise deployment option', included: true },
  { text: '99.99% uptime SLA', included: true },
];

export function PricingPage({ className }: PricingPageProps): React.ReactElement {
  const [isAnnual, setIsAnnual] = useState(false);

  const proPrice = isAnnual ? '$10' : '$12';
  const proSavings = isAnnual ? 'Save 17%' : null;

  return (
    <div className={`pricing-page ${className || ''}`}>
      <Header currentPage="/pricing" />

      <section className="pricing-hero">
        <h1>Simple, Transparent Pricing</h1>
        <p>Start free. Scale as you grow. No hidden fees.</p>

        {/* Billing toggle */}
        <div className="pricing-toggle" role="group" aria-label="Billing period">
          <span
            className={`pricing-toggle__label ${!isAnnual ? 'pricing-toggle__label--active' : ''}`}
          >
            Monthly
          </span>
          <button
            className="pricing-toggle__switch"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label={isAnnual ? 'Switch to monthly billing' : 'Switch to annual billing'}
          >
            <span
              className={`pricing-toggle__knob ${isAnnual ? 'pricing-toggle__knob--annual' : ''}`}
            />
          </button>
          <span
            className={`pricing-toggle__label ${isAnnual ? 'pricing-toggle__label--active' : ''}`}
          >
            Annual
          </span>
          {proSavings && <span className="pricing-toggle__badge">{proSavings}</span>}
        </div>
      </section>

      <section className="pricing-grid">
        <PricingCard
          name="Free"
          price="$0"
          period="month"
          description="For individuals getting started with privacy-first tools."
          features={FREE_FEATURES}
          cta="Get Started Free"
        />
        <PricingCard
          name="Pro"
          price={proPrice}
          period="month"
          description="For professionals and small teams who need more power."
          features={PRO_FEATURES}
          cta="Start Pro Trial"
          highlighted={true}
        />
        <PricingCard
          name="Enterprise"
          price="Custom"
          description="For organizations with advanced security and compliance needs."
          features={ENTERPRISE_FEATURES}
          cta="Contact Sales"
        />
      </section>

      {/* Feature Comparison Table */}
      <section className="pricing-comparison">
        <h2 className="pricing-comparison__title">Detailed Feature Comparison</h2>
        <ComparisonTable />
      </section>

      <CTASection
        headline="Not sure which plan is right?"
        subheadline="Start with Free and upgrade anytime. All plans include E2E encryption and all 13 apps."
        primaryCta="Start Free"
        primaryHref="/signup"
        secondaryCta="Compare Plans"
        secondaryHref="/pricing/compare"
      />

      <Footer />
    </div>
  );
}
