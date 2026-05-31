import React, { useState, useEffect, useCallback } from 'react';

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  companyLogo?: string;
  avatar?: string;
}

export interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoRotateMs?: number;
}

export function TestimonialCarousel({
  testimonials,
  autoRotateMs = 5000,
}: TestimonialCarouselProps): React.ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (isPaused || testimonials.length <= 1) return;

    const timer = setInterval(goToNext, autoRotateMs);
    return () => clearInterval(timer);
  }, [isPaused, goToNext, autoRotateMs, testimonials.length]);

  if (testimonials.length === 0) return <div className="testimonial-carousel--empty" />;

  const current = testimonials[activeIndex];
  if (!current) return <div className="testimonial-carousel--empty" />;

  return (
    <div
      className="testimonial-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Testimonials carousel"
      aria-roledescription="carousel"
    >
      <button
        className="testimonial-carousel__arrow testimonial-carousel__arrow--prev"
        onClick={goToPrev}
        aria-label="Previous testimonial"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="testimonial-carousel__slide" aria-live="polite">
        <blockquote className="testimonial-carousel__quote">
          &ldquo;{current.quote}&rdquo;
        </blockquote>
        <div className="testimonial-carousel__author">
          <div className="testimonial-carousel__avatar" aria-hidden="true">
            {current.avatar ? (
              <img src={current.avatar} alt="" />
            ) : (
              <span className="testimonial-carousel__avatar-placeholder">
                {current.author.charAt(0)}
              </span>
            )}
          </div>
          <div className="testimonial-carousel__author-info">
            <strong className="testimonial-carousel__name">{current.author}</strong>
            <span className="testimonial-carousel__role">
              {current.role}, {current.company}
            </span>
          </div>
          {current.companyLogo && (
            <img
              className="testimonial-carousel__company-logo"
              src={current.companyLogo}
              alt={`${current.company} logo`}
            />
          )}
        </div>
      </div>

      <button
        className="testimonial-carousel__arrow testimonial-carousel__arrow--next"
        onClick={goToNext}
        aria-label="Next testimonial"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="testimonial-carousel__dots" role="tablist" aria-label="Testimonial slides">
        {testimonials.map((_, index) => (
          <button
            key={index}
            className={`testimonial-carousel__dot ${index === activeIndex ? 'testimonial-carousel__dot--active' : ''}`}
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Go to testimonial ${index + 1}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
