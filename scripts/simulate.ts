// npm run simulate — 쉬지 않고 하는 사람이 캠페인을 끝까지 미는 데 걸리는 시간과 장마다의 전투력·레벨을 표로 출력한다.
import { chapterTitle, simulateRun } from '../src/core/sim';
import { EPISODES } from '../src/data/story';
import { YOKAI_BY_ID } from '../src/data/yokai';
import { fmt } from '../src/core/format';

const hm = (m: number | undefined) => (m === undefined ? '—' : `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분`);

const t0 = Date.now();
const r = simulateRun();
console.log(`\n## 쉬지 않고 하는 사람 (${((Date.now() - t0) / 1000).toFixed(1)}초 계산)\n`);
console.log('| 장 | 깬 때 | 편성 전투력 | 평균 레벨 |');
console.log('|---|---|---|---|');
for (const ep of EPISODES) console.log(`| ${chapterTitle(ep.id)} | ${hm(r.chapterAt[ep.id])} | ${fmt(r.powerAt[ep.id] ?? 0)} | ${r.levelAt[ep.id] ?? '—'} |`);
const b = r.battles;
console.log(`\n전체 ${hm(r.minutes)} · 스테이지 ${b.stage}판 · 수련장 ${b.train}판 · 패배 ${b.losses} · 모집 ${r.pulls}번(SSR ${r.ssr})`);
console.log(`막힘: ${r.stuck ?? '없음'} · 남은 옥 ${fmt(r.final.res.jade)} · 수련치 ${fmt(r.final.res.exp)} · 엽전 ${fmt(r.final.res.coin)}`);
console.log(
  '식객: ' +
    Object.entries(r.final.yokai)
      .map(([id, y]) => `${YOKAI_BY_ID[id].name} Lv${y.level}★${y.stars}`)
      .join(', '),
);
console.log('편성: ' + r.final.team.map((id) => (id ? YOKAI_BY_ID[id].name : '-')).join(', '));
