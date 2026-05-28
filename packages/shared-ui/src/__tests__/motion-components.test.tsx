// @vitest-environment jsdom
// ============================================================================
// Shared UI - Motion Component Tests
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    path: (props: any) => <path {...props} />,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    ol: ({ children, ...props }: any) => <ol {...props}>{children}</ol>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

import { FadeIn } from '../components/Motion/FadeIn';
import { StaggerList } from '../components/Motion/StaggerList';
import { PageTransition } from '../components/Motion/PageTransition';
import { SpringButton } from '../components/Motion/SpringButton';
import { AnimatedSkeleton } from '../components/Motion/AnimatedSkeleton';
import { SlidePanel } from '../components/Motion/SlidePanel';
import { ScaleOnHover } from '../components/Motion/ScaleOnHover';
import { MotionProvider, useMotionConfig } from '../components/Motion/MotionConfig';

describe('FadeIn', () => {
  it('renders children correctly', () => {
    render(<FadeIn>Hello World</FadeIn>);
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('accepts className', () => {
    const { container } = render(<FadeIn className="test-class">Content</FadeIn>);
    const el = container.firstElementChild;
    expect(el?.className).toContain('test-class');
  });
});

describe('StaggerList', () => {
  it('renders children correctly', () => {
    render(
      <StaggerList>
        <span>Item 1</span>
        <span>Item 2</span>
      </StaggerList>,
    );
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
  });
});

describe('PageTransition', () => {
  it('renders children correctly', () => {
    render(<PageTransition>Page Content</PageTransition>);
    expect(screen.getByText('Page Content')).toBeDefined();
  });
});

describe('SpringButton', () => {
  it('renders children correctly', () => {
    render(<SpringButton>Click Me</SpringButton>);
    expect(screen.getByText('Click Me')).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<SpringButton onClick={handleClick}>Click</SpringButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('AnimatedSkeleton', () => {
  it('renders with correct aria attributes', () => {
    render(<AnimatedSkeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeDefined();
    expect(skeleton.getAttribute('aria-busy')).toBe('true');
  });
});

describe('SlidePanel', () => {
  it('renders children when isOpen is true', () => {
    render(
      <SlidePanel isOpen={true}>
        <span>Panel Content</span>
      </SlidePanel>,
    );
    expect(screen.getByText('Panel Content')).toBeDefined();
  });

  it('does NOT render children when isOpen is false', () => {
    render(
      <SlidePanel isOpen={false}>
        <span>Panel Content</span>
      </SlidePanel>,
    );
    expect(screen.queryByText('Panel Content')).toBeNull();
  });
});

describe('ScaleOnHover', () => {
  it('renders children correctly', () => {
    render(<ScaleOnHover>Hover Me</ScaleOnHover>);
    expect(screen.getByText('Hover Me')).toBeDefined();
  });
});

describe('MotionProvider + useMotionConfig', () => {
  function TestConsumer() {
    const { shouldAnimate } = useMotionConfig();
    return <span data-testid="animate-value">{String(shouldAnimate)}</span>;
  }

  it('provides shouldAnimate context', () => {
    render(
      <MotionProvider>
        <TestConsumer />
      </MotionProvider>,
    );
    const el = screen.getByTestId('animate-value');
    expect(el.textContent).toBe('true');
  });
});
