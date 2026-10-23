import { GUIDE, advanceGuide, type GuideStep } from '../core/guide';
import { GIFT_BY_ID } from '../data/village';
import { YOKAI_BY_ID } from '../data/yokai';
import { Portrait } from './Portrait';
import { act } from './store';

export function rewardText(step: GuideStep): string {
  const r = step.reward;
  if (!r) return '';
  const parts: string[] = [];
  if (r.coin) parts.push(`엽전 +${r.coin}`);
  if (r.grain) parts.push(`곡식 +${r.grain}`);
  if (r.fame) parts.push(`명성 +${r.fame}`);
  if (r.gift) parts.push(`선물 〈${GIFT_BY_ID[r.gift].name}〉`);
  return parts.join(' · ');
}

/** 화면 아래 안내 말풍선. 지금 눌러야 할 곳을 반짝여 표시한다. */
export function GuideBar({ step, index, tab }: { step: GuideStep; index: number; tab: string }) {
  const def = YOKAI_BY_ID[step.who];
  const keys = step.tab && step.tab !== tab ? [`tab-${step.tab}`] : (step.target ?? '').split(' ').filter(Boolean);
  const selector = keys.map((k) => `[data-guide="${k}"]`).join(', ');
  return (
    <>
      {selector && <style>{`${selector} { animation: guidePulse 1.2s ease-in-out infinite; z-index: 11; }`}</style>}
      <div className="guide" role="status">
        <div className="guide-face">
          <Portrait def={def} />
        </div>
        <div className="guide-body">
          <div className="guide-name">
            {def.name}
            <small>
              안내 {index + 1}/{GUIDE.length}
            </small>
          </div>
          <div className="guide-text">
            {step.tab && step.tab !== tab ? `아래 〈${{ home: '궁궐', yokai: '식객', stage: '토벌' }[step.tab]}〉 탭으로 가 볼까요? ` : ''}
            {step.text}
          </div>
          {!step.done && (
            <button className="btn hong small" onClick={() => act((s) => advanceGuide(s, true))}>
              알겠어요
            </button>
          )}
          {step.reward && <div className="soft" style={{ fontSize: 13, marginTop: 4 }}>보상: {rewardText(step)}</div>}
        </div>
      </div>
    </>
  );
}
