// The Home headline's film-title entrance, run with the Web Animations API so it survives redraws:
// the page redraws itself shortly after opening (initiatives load, Rafeeq connects), which would
// cut a CSS animation short. Each redraw recreates the elements, so the animation is re-created
// and jumped to the time already elapsed since Home opened.
export const HERO_INTRO_MS = 2600;
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

export function playHeroIntro(root, elapsed) {
  if (typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const title = root.querySelector('.hero-title');
  if (!title || typeof title.animate !== 'function') return;
  const run = (el, keyframes, opts) => {
    if (!el) return;
    const a = el.animate(keyframes, { fill: 'both', ...opts });
    a.currentTime = elapsed;
  };
  run(title, [{ letterSpacing: '.05em' }, { letterSpacing: '-.02em' }], { duration: 1600, easing: 'cubic-bezier(.2,.8,.2,1)' });
  title.querySelectorAll('.hw').forEach((w, i) => run(w, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 850, delay: 100 + i * 90, easing: EASE_OUT }));
  run(title.querySelector('.hl'), [{ opacity: 0 }, { opacity: 0, offset: 0.499 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }], { duration: 800, delay: 750 });
  run(title.querySelector('.hbox'), [
    { transform: 'scaleX(0)', transformOrigin: 'left center' },
    { transform: 'scaleX(1)', transformOrigin: 'left center', offset: 0.5 },
    { transform: 'scaleX(1)', transformOrigin: 'right center', offset: 0.501 },
    { transform: 'scaleX(0)', transformOrigin: 'right center' }
  ], { duration: 800, delay: 750, easing: 'cubic-bezier(.7,0,.3,1)' });
  run(title.querySelector('.hline'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 550, delay: 1550, easing: 'cubic-bezier(.3,.8,.3,1)' });
  const text = title.parentElement;
  const fade = (sel, delay) => run(text.querySelector(sel), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay, easing: 'cubic-bezier(.2,.8,.2,1)' });
  fade(':scope > .eyebrow', 0); fade(':scope > .lead', 1600); fade(':scope > .row', 1800);
}
