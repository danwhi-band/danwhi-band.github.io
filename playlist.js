(() => {
  const box = document.getElementById('playlist');
  const button = document.getElementById('playlist-play');
  if (!box || !button) return;
  const list = box.dataset.list;
  button.addEventListener('click', () => {
    if (!list) { console.error('[playlist] data-list missing'); return; }
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&autoplay=1&playsinline=1&rel=0`;
    frame.title = '단휘밴드 공연 영상 재생목록 (YouTube)';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('error', () => console.error('[playlist] iframe failed to load', frame.src));
    box.querySelector('.playlist-screen').replaceChildren(frame);
    box.classList.add('is-playing');
    frame.focus();
  }, { once: true });
})();
