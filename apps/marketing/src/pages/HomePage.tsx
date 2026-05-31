import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { CTASection } from '../components/CTASection.js';
import { AppShowcase, QUANT_APPS } from '../components/AppShowcase.js';
import { TestimonialCard } from '../components/TestimonialCard.js';

export interface HomePageProps {
  className?: string;
}

const TESTIMONIALS = [
  {
    quote:
      'Quant replaced our entire Google Workspace with better privacy and offline support. The AI features are genuinely useful.',
    author: 'Sarah Chen',
    role: 'CTO',
    company: 'TechForward',
  },
  {
    quote:
      'The local-first architecture means our team works seamlessly whether online or offline. No more lost work.',
    author: 'Marcus Rodriguez',
    role: 'Engineering Lead',
    company: 'DataSync Labs',
  },
  {
    quote:
      'End-to-end encryption by default gave us confidence to move all our sensitive work onto Quant.',
    author: 'Alex Thompson',
    role: 'Security Director',
    company: 'SecureOps Inc',
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    title: 'End-to-End Encrypted',
    description: 'All data encrypted by default. Only you hold the keys.',
    icon: '\uD83D\uDD12',
  },
  {
    title: 'Local-First Architecture',
    description: 'Your data lives on your device. Work offline seamlessly.',
    icon: '\uD83D\uDCF1',
  },
  {
    title: 'AI-Powered',
    description: 'Smart features that respect your privacy. AI runs on your terms.',
    icon: '\uD83E\uDDE0',
  },
  {
    title: '13 Integrated Apps',
    description:
      'Mail, Drive, Docs, Calendar, Meet, Chat, Tasks, Code, Sheets, Slides, Photos, Notes, Forms.',
    icon: '\uD83D\uDCE6',
  },
  {
    title: 'Real-Time Collaboration',
    description: 'CRDT-based sync for conflict-free teamwork across all apps.',
    icon: '\uD83D\uDD04',
  },
  {
    title: 'Cross-Platform',
    description: 'Web, desktop, iOS, Android. Your workspace everywhere.',
    icon: '\uD83C\uDF10',
  },
];

interface CounterStat {
  label: string;
  target: number;
  suffix: string;
}

const SOCIAL_PROOF_STATS: CounterStat[] = [
  { label: 'Users', target: 1000000, suffix: '+' },
  { label: 'Messages Sent', target: 500000000, suffix: '+' },
  { label: 'Files Secured', target: 10000000000, suffix: '+' },
];

function formatNumber(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(0)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

function AnimatedCounter({ stat }: { stat: CounterStat }): React.ReactElement {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = stat.target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= stat.target) {
        setCount(stat.target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [stat.target]);

  return (
    <div className="social-proof__stat">
      <span className="social-proof__number">
        {formatNumber(count)}
        {stat.suffix}
      </span>
      <span className="social-proof__label">{stat.label}</span>
    </div>
  );
}

export function HomePage({ className }: HomePageProps): React.ReactElement {
  return (
    <div className={`home-page ${className || ''}`}>
      <Header currentPage="/" />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__background" aria-hidden="true">
          <div className="hero__gradient-orb hero__gradient-orb--1" />
          <div className="hero__gradient-orb hero__gradient-orb--2" />
        </div>

        <div className="hero__content">
          <h1 className="hero-title">
            <span className="hero-title__gradient">One Platform. Everything You Need.</span>
          </h1>
          <p className="hero-subtitle">
            Replace your entire workspace with 13 integrated apps. End-to-end encrypted,
            local-first, and AI-powered.
          </p>
          <div className="hero-cta">
            <a href="/signup" className="btn-primary btn-primary--pulse">
              Get Started Free
            </a>
            <a href="/demo" className="btn-secondary">
              <span className="btn-secondary__play-icon" aria-hidden="true">
                {'\u25B6'}
              </span>
              Watch Demo
            </a>
          </div>
        </div>

        {/* Floating product screenshots with parallax */}
        <div className="hero__screenshots" aria-hidden="true">
          <div className="hero__screenshot hero__screenshot--1" data-parallax="0.05">
            <div className="hero__screenshot-inner">Mail</div>
          </div>
          <div className="hero__screenshot hero__screenshot--2" data-parallax="0.08">
            <div className="hero__screenshot-inner">Docs</div>
          </div>
          <div className="hero__screenshot hero__screenshot--3" data-parallax="0.03">
            <div className="hero__screenshot-inner">AI</div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="feature-highlights">
        <h2 className="feature-highlights__heading">Why Teams Choose Quant</h2>
        <div className="features-grid">
          {FEATURE_HIGHLIGHTS.map((feature) => (
            <div key={feature.title} className="feature-highlight">
              <span className="feature-highlight__icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="feature-highlight__title">{feature.title}</h3>
              <p className="feature-highlight__description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof Counter Section */}
      <section className="social-proof">
        <h2 className="social-proof__heading">Trusted by Teams Worldwide</h2>
        <div className="social-proof__stats">
          {SOCIAL_PROOF_STATS.map((stat) => (
            <AnimatedCounter key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* App Showcase */}
      <AppShowcase apps={QUANT_APPS} title="13 Apps, One Ecosystem" />

      {/* Testimonials */}
      <section className="testimonials">
        <h2>Trusted by Forward-Thinking Teams</h2>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.author} {...testimonial} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to Own Your Data?"
        subheadline="Start with 5GB free storage. No credit card required."
        primaryCta="Get Started Free"
        primaryHref="/signup"
        secondaryCta="Talk to Sales"
        secondaryHref="/contact"
      />

      <Footer />
    </div>
  );
}
