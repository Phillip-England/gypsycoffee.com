const root = document.documentElement;
root.classList.add('js');

const journey = document.getElementById('journey');
const panels = [...document.querySelectorAll('.scene-panel')];
const foodSceneIndex = panels.findIndex(panel => panel.id === 'food');
const foregrounds = panels.map(panel => [...panel.querySelectorAll('.hero-content, .hero-side-note, .hours-content, .hours-photo-credit, .music-content, .music-side-note, .drinks-content, .food-heading, .food-gallery, .food-footer, .closing-content')]);
const progressNumber = document.querySelector('.progress-number');
const progressFill = document.querySelector('.progress-fill');
const progressDisplay = document.querySelector('.scene-progress');
const scrollPrompt = document.querySelector('.scroll-prompt');
const heroVideo = document.querySelector('.hero-video');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
let ticking = false;

function update() {
  ticking = false;
  if (reducedMotion.matches) {
    heroVideo?.pause();
    return;
  }
  const range = Math.max(1, journey.offsetHeight - window.innerHeight);
  const progress = clamp(-journey.getBoundingClientRect().top / range);
  const position = progress * (panels.length - 1);
  const active = Math.min(panels.length - 1, Math.floor(position + .5));
  const foodCrossfade = window.innerWidth > 700 && position > foodSceneIndex - 1 && position < foodSceneIndex;
  const blend = position - (foodSceneIndex - 1);
  journey.dataset.scene = panels[active].id;
  panels.forEach((panel, index) => {
    const distance = Math.abs(position - index);
    const opacity = foodCrossfade ? (index === foodSceneIndex - 1 ? 1 : index === foodSceneIndex ? blend : 0) : clamp((.7 - distance) / .4);
    panel.style.opacity = opacity.toFixed(3);
    panel.style.transform = `translate3d(0, ${Math.round((index - position) * 30)}px, 0)`;
    const foregroundOpacity = foodCrossfade ? (index === foodSceneIndex - 1 ? clamp((.5 - blend) / .25) : index === foodSceneIndex ? clamp((blend - .5) / .25) : 0) : 1;
    foregrounds[index].forEach(element => { element.style.opacity = foregroundOpacity.toFixed(3); });
    panel.inert = index !== active;
    panel.classList.toggle('is-active', index === active);
  });
  if (heroVideo) {
    if (active === 0 && heroVideo.paused) heroVideo.play().catch(() => {});
    if (active !== 0 && !heroVideo.paused) heroVideo.pause();
  }
  progressNumber.textContent = String(active + 1).padStart(2, '0');
  progressFill.style.transform = `scaleX(${progress.toFixed(4)})`;
  progressDisplay.setAttribute('aria-label', `Scene ${active + 1} of ${panels.length}`);
  scrollPrompt.href = `#${panels[Math.min(active + 1, panels.length - 1)].id}`;
  scrollPrompt.hidden = active === panels.length - 1;
}
function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
}
function scrollToPanel(index, behavior = 'smooth') {
  if (reducedMotion.matches) {
    panels[index].scrollIntoView({ behavior });
    return;
  }
  const range = journey.offsetHeight - window.innerHeight;
  window.scrollTo({ top: journey.offsetTop + range * index / (panels.length - 1), behavior });
}
update();
window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const index = panels.findIndex(panel => `#${panel.id}` === link.getAttribute('href'));
    if (index < 0) return;
    event.preventDefault();
    history.pushState(null, '', `#${panels[index].id}`);
    scrollToPanel(index);
  });
});
if (location.hash) {
  const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
  if (index >= 0) requestAnimationFrame(() => scrollToPanel(index, 'instant'));
}
window.addEventListener('popstate', () => {
  const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
  scrollToPanel(Math.max(0, index), 'instant');
});

const foodTrack = document.getElementById('foodTrack');
const foodCards = [...foodTrack.children];
const foodCount = document.getElementById('foodCount');
function foodIndex() {
  return foodCards.reduce((closest, card, index) =>
    Math.abs(card.offsetLeft - foodTrack.offsetLeft - foodTrack.scrollLeft) < Math.abs(foodCards[closest].offsetLeft - foodTrack.offsetLeft - foodTrack.scrollLeft) ? index : closest, 0);
}
function updateFoodCount() {
  foodCount.textContent = `${String(foodIndex() + 1).padStart(2, '0')} / ${String(foodCards.length).padStart(2, '0')}`;
}
function moveFood(direction) {
  const visible = window.innerWidth <= 700 ? 1 : 3;
  const next = clamp(foodIndex() + direction * visible, 0, foodCards.length - visible);
  foodTrack.scrollTo({ left: foodCards[next].offsetLeft - foodTrack.offsetLeft, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.getElementById('foodPrevious').addEventListener('click', () => moveFood(-1));
document.getElementById('foodNext').addEventListener('click', () => moveFood(1));
foodTrack.addEventListener('scroll', updateFoodCount, { passive: true });
window.addEventListener('resize', updateFoodCount);

const saleNotice = document.getElementById('saleNotice');
if (saleNotice) {
  const bubble = document.getElementById('saleNoticeBubble');
  const closeButton = document.getElementById('saleNoticeClose');
  const background = [document.querySelector('.site-header'), document.querySelector('main')];
  let closing = false;

  function minimizeNotice() {
    if (closing) return;
    closing = true;
    bubble.hidden = false;
    bubble.classList.add('is-pending');
    const card = saleNotice.getBoundingClientRect();
    const target = bubble.getBoundingClientRect();
    saleNotice.style.setProperty('--minimize-x', `${target.left + target.width / 2 - card.left - card.width / 2}px`);
    saleNotice.style.setProperty('--minimize-y', `${target.top + target.height / 2 - card.top - card.height / 2}px`);
    saleNotice.classList.add('is-closing');
    window.setTimeout(() => {
      saleNotice.close();
      saleNotice.classList.remove('is-closing');
      document.body.classList.remove('sale-notice-open');
      background.forEach(element => { element.inert = false; });
      bubble.classList.remove('is-pending');
      bubble.focus({ preventScroll: true });
      closing = false;
    }, reducedMotion.matches ? 0 : 350);
  }

  function reopenNotice() {
    background.forEach(element => { element.inert = true; });
    saleNotice.showModal();
    document.body.classList.add('sale-notice-open');
    if (!reducedMotion.matches) {
      saleNotice.classList.add('is-opening');
      requestAnimationFrame(() => saleNotice.classList.remove('is-opening'));
    }
    bubble.hidden = true;
    closeButton.focus({ preventScroll: true });
  }

  closeButton.addEventListener('click', minimizeNotice);
  document.getElementById('saleNoticeEnter').addEventListener('click', minimizeNotice);
  bubble.addEventListener('click', reopenNotice);
  saleNotice.addEventListener('cancel', event => { event.preventDefault(); minimizeNotice(); });
  saleNotice.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); minimizeNotice(); }
  });
  saleNotice.addEventListener('click', event => { if (event.target === saleNotice) minimizeNotice(); });
  saleNotice.showModal();
  document.body.classList.add('sale-notice-open');
  closeButton.focus({ preventScroll: true });
}
