// 새 버전 알림. 휴대폰 브라우저가 예전 화면을 붙들고 있어도, 앱으로 돌아올 때 version.json을 확인해 새로고침을 권한다.
import { useEffect, useState } from 'react';

const CHECK_EVERY = 10 * 60_000;

async function latestBuild(): Promise<string | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { build?: string };
    return data.build ?? null;
  } catch {
    return null;
  }
}

/** 지금 화면보다 새 빌드가 올라와 있으면 true */
export function useNewVersion(): boolean {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let last = 0;
    const check = async () => {
      if (Date.now() - last < 60_000) return;
      last = Date.now();
      const build = await latestBuild();
      if (build && build !== __BUILD_ID__) setFresh(true);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    void check();
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return fresh;
}
