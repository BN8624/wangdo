// 방문 통계(선택). 빌드할 때 VITE_GOATCOUNTER에 GoatCounter 주소를 넣었을 때만 켜진다.
// 예: VITE_GOATCOUNTER=https://wangdo.goatcounter.com/count — 쿠키를 쓰지 않고, 무료(비영리)다.
// 주소가 없으면 아무것도 하지 않는다.
const ENDPOINT = import.meta.env.VITE_GOATCOUNTER as string | undefined;

type GoatCounter = { count?: (o: { path: string; title?: string; event?: boolean }) => void };

export function initAnalytics() {
  if (!ENDPOINT) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = ENDPOINT;
  document.head.appendChild(s);
}

/** 이야기를 다 봤다, 첫 토벌을 이겼다 같은 이정표를 센다 */
export function track(path: string) {
  if (!ENDPOINT) return;
  (window as Window & { goatcounter?: GoatCounter }).goatcounter?.count?.({ path: `event/${path}`, event: true });
}
