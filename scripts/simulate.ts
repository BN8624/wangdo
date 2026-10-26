// npm run simulate — 쉬지 않고 계속 하는 사람이 1·2부를 다 하는 데 걸리는 시간과, 화·던전마다의 평균 레벨을 표로 출력한다.
import { simulateRun } from '../src/core/sim';
import { EPISODES } from '../src/data/story';
import { NODE_BY_ID } from '../src/data/world';
import { ownedYokai } from '../src/core/engine';
import { fmt } from '../src/core/format';

const hm = (m: number | undefined) => (m === undefined ? '—' : `${Math.floor(m / 60)}시간 ${Math.round(m % 60)}분`);

const t0 = Date.now();
const r = simulateRun();
console.log(`\n## 쉬지 않고 하는 사람 (${((Date.now() - t0) / 1000).toFixed(1)}초 계산)\n`);
console.log('| 화 | 마친 때 | 평균 레벨 | 엽전 |');
console.log('|---|---|---|---|');
for (const ep of EPISODES) console.log(`| ${ep.season}부 ${ep.no}화 ${ep.title} | ${hm(r.episodeAt[ep.id])} | ${r.levelAt[ep.id] ?? '—'} | ${fmt(r.coinAt[ep.id] ?? 0)} |`);
console.log('\n| 던전·사연·만남 | 끝낸 때 |');
console.log('|---|---|');
for (const [id, m] of Object.entries(r.nodeAt).sort((a, b) => a[1] - b[1])) console.log(`| ${NODE_BY_ID[id]?.name ?? id} | ${hm(m)} |`);
const b = r.battles;
console.log(`\n전체 ${hm(r.minutes)} · 전투 ${b.story + b.dungeon + b.quest + b.field}판 (이야기 ${b.story}, 던전 ${b.dungeon}, 사연 ${b.quest}, 필드 ${b.field}, 패배 ${b.losses})`);
console.log(`막힘: ${r.stuck ?? '없음'} · 남은 엽전 ${fmt(r.final.res.coin)}`);
console.log('식객: ' + ownedYokai(r.final).map((y) => `${y.def.name} Lv${y.state.level}`).join(', '));

// 종류별 이길 확률(첫 도전만)과 레벨 차이
const kinds = ['story', 'dungeon', 'boss', 'quest', 'field'];
console.log('\n| 종류 | 판 | 평균 확률 | 최저 | 평균(우리−상대 레벨) | 승률 |');
console.log('|---|---|---|---|---|---|');
for (const k of kinds) {
  const f = r.fights.filter((x) => x.kind === k);
  if (!f.length) continue;
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
  console.log(`| ${k} | ${f.length} | ${(mean(f.map((x) => x.chance)) * 100).toFixed(0)}% | ${(Math.min(...f.map((x) => x.chance)) * 100).toFixed(0)}% | ${mean(f.map((x) => x.avg - x.level)).toFixed(1)} | ${((f.filter((x) => x.won).length / f.length) * 100).toFixed(0)}% |`);
}
