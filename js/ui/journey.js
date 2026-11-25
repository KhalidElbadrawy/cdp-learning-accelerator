// The learning-path journey navigator: a slim gradient scroll bar with arrow buttons above the
// journey, edge fades that show there is more to either side, and a step counter. The native
// scroll bar is hidden; the journey still scrolls by touch, trackpad and keyboard.
let observers = [];

export function wireJourneys(root) {
  observers.forEach(o => o.disconnect());
  observers = [];
  root.querySelectorAll('[data-jscroll]').forEach(box => {
    const sc = box.querySelector('.journey');
    const track = box.querySelector('.jtrack'), thumb = box.querySelector('.jthumb');
    const count = box.querySelector('.jcount');
    const [prev, next] = box.querySelectorAll('.jnav');
    const steps = [...box.querySelectorAll('.jstep')];
    if (!sc || !track || !thumb) return;

    const update = () => {
      const max = sc.scrollWidth - sc.clientWidth;
      const fits = max <= 2;
      box.classList.toggle('fits', fits);
      box.classList.toggle('at-start', sc.scrollLeft <= 2);
      box.classList.toggle('at-end', sc.scrollLeft >= max - 2);
      const ratio = Math.min(1, sc.clientWidth / sc.scrollWidth);
      thumb.style.width = `${ratio * 100}%`;
      thumb.style.left = `${max > 0 ? (sc.scrollLeft / max) * (100 - ratio * 100) : 0}%`;
      if (prev) prev.disabled = fits || sc.scrollLeft <= 2;
      if (next) next.disabled = fits || sc.scrollLeft >= max - 2;
      // Which steps are fully in view.
      const left = sc.getBoundingClientRect().left, right = left + sc.clientWidth;
      const vis = steps.map((s, i) => [i + 1, s.getBoundingClientRect()]).filter(([, r]) => r.left >= left - 4 && r.right <= right + 4).map(([n]) => n);
      if (count && steps.length) count.textContent = fits || !vis.length ? `${steps.length} steps` : `Steps ${vis[0]}–${vis[vis.length - 1]} of ${steps.length}`;
    };
    const stepWidth = () => (steps[1] ? steps[1].offsetLeft - steps[0].offsetLeft : sc.clientWidth / 2);

    sc.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    [prev, next].forEach(b => b && b.addEventListener('click', () => sc.scrollBy({ left: Number(b.dataset.jdir) * stepWidth(), behavior: 'smooth' })));
    // Click the track to jump; drag the thumb to scrub.
    track.addEventListener('pointerdown', e => {
      const rect = track.getBoundingClientRect();
      const max = sc.scrollWidth - sc.clientWidth;
      const tw = thumb.getBoundingClientRect().width;
      const scrubTo = x => { sc.scrollLeft = Math.max(0, Math.min(1, (x - rect.left - tw / 2) / (rect.width - tw))) * max; };
      if (e.target !== thumb) sc.scrollTo({ left: Math.max(0, Math.min(1, (e.clientX - rect.left - tw / 2) / (rect.width - tw))) * max, behavior: 'smooth' });
      else {
        track.setPointerCapture(e.pointerId);
        box.classList.add('dragging');
        const move = ev => scrubTo(ev.clientX);
        const up = () => { box.classList.remove('dragging'); track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); };
        track.addEventListener('pointermove', move); track.addEventListener('pointerup', up);
      }
    });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); sc.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * stepWidth(), behavior: 'smooth' }); }
    });
    if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(update); ro.observe(sc); observers.push(ro); }
    update();
  });
}
