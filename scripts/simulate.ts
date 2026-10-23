// npm run simulate — 플레이 성향별로 칭호·소동 진행 시점을 표로 출력한다.
import { RANKS } from '../src/data/ranks';
import { CHAPTERS } from '../src/data/stages';
import { bondLevel, ownedYokai, power, ratesPerMinute } from '../src/core/engine';
import { fmt } from '../src/core/format';
import { PROFILES, simulate } from '../src/core/sim';

const DAYS = 21;

function when(hours: number | null): string {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}분`;
  if (hours < 24) return `${hours.toFixed(1)}시간`;
  return `${Math.floor(hours / 24) + 1}일차 (${hours.toFixed(0)}h)`;
}

for (const profile of Object.values(PROFILES)) {
  const r = simulate(profile, DAYS);
  console.log(`\n## ${profile.name} (접속: ${profile.checkInHours.join(', ')}시)\n`);
  console.log('| 칭호 | 도달 | 막힌 접속(위세/명성) |');
  console.log('|---|---|---|');
  RANKS.forEach((rank, i) =>
    console.log(`| ${i}. ${rank.title} | ${when(r.rankReachedAt[i] ?? null)} | ${r.blockedBy[i].power}/${r.blockedBy[i].fame} |`),
  );
  console.log('\n| 소동 | 대장 달램 |');
  console.log('|---|---|');
  CHAPTERS.forEach((c, i) => console.log(`| ${c.title} | ${when(r.bossClearedAt[i] ?? null)} |`));
  const s = r.final;
  const rates = ratesPerMinute(s);
  console.log(
    `\n${DAYS}일 뒤: 칭호 ${s.rank}, 위세 ${fmt(power(s))}, 소동 ${s.stage.index}, ` +
      `분당 엽전 ${fmt(rates.coin)} 곡식 ${fmt(rates.grain)} 명성 ${rates.fame.toFixed(2)}, ` +
      `남은 엽전 ${fmt(s.res.coin)} 곡식 ${fmt(s.res.grain)} 명성 ${fmt(s.res.fame)} · 승 ${s.totals.wins} 패 ${s.totals.losses}`,
  );
  console.log('식객: ' + ownedYokai(s).map((y) => `${y.def.name} Lv${y.state.level}·인연${bondLevel(y.state.bond)}`).join(', '));
}
