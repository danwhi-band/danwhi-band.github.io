'use strict';
(() => {
  const eventDay = Date.UTC(2026, 11, 5);
  function getKoreanDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul', year:'numeric', month:'numeric', day:'numeric'}).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  }
  let countdownTimer;
  function updateCountdown() {
    clearTimeout(countdownTimer);
    const days = Math.round((eventDay - getKoreanDate()) / 86400000);
    const element = document.getElementById('countdown');
    element.textContent = days > 0 ? `D−${days}` : days === 0 ? 'D-DAY' : 'THANK YOU';
    element.setAttribute('aria-label', days > 0 ? `공연 날짜까지 ${days}일` : days === 0 ? '오늘은 공연 날짜입니다' : '공연 날짜가 지났습니다');
    const now = new Date();
    const nextKoreanMidnight = getKoreanDate(now) + 86400000 - 9 * 3600000;
    countdownTimer = setTimeout(updateCountdown, Math.max(100, nextKoreanMidnight - now.getTime() + 25));
  }
  updateCountdown();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCountdown(); });
  window.addEventListener('pageshow', updateCountdown);
  const allSongs = Array.from(document.querySelectorAll('.song'));
  const expandButton = document.getElementById('expand-all');
  function updateExpandButton() {
    const allOpen = allSongs.every(song => song.open);
    expandButton.innerHTML = allOpen ? '모두 접기 <span aria-hidden="true">−</span>' : '모두 펼치기 <span aria-hidden="true">＋</span>';
    expandButton.setAttribute('aria-pressed', String(allOpen));
  }
  expandButton.addEventListener('click', () => {
    const shouldOpen = !allSongs.every(song => song.open);
    allSongs.forEach(song => { song.open = shouldOpen; });
    updateExpandButton();
  });
  allSongs.forEach(song => song.addEventListener('toggle', updateExpandButton));
})();
