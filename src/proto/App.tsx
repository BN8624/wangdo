// 시제품 화면 전체: 첫 화면 → 자동 진행(맵·대화·선택·전투) → 끝 화면
import { useCallback, useEffect, useState } from 'react';
import { onSoundChange, play, setMood, setSound, soundSettings } from '../ui/sound';
import { MEMBER_NAME } from './data';
import { Battle } from './Battle';
import { Field } from './Field';
import { MAPS } from './maps';
import { Choice, Collect, DebtScroll, Defeat, Dialogue, Gift, Join, josa, PartyList, Shop, SkillGet, Sprite } from './Panels';
import { buy, load, newGame, save, SAVE_KEY, step, type Effect, type Game, type Input } from './runner';

const UI_KEY = 'wangdo.proto.ui';
/** 성인 확인(기존 게임과 같은 키: 한 번 확인하면 둘 다 통과) */
const ADULT_KEY = 'wangdo.adult';
function adultConfirmed(): boolean {
  try {
    return localStorage.getItem(ADULT_KEY) === '1';
  } catch {
    return false;
  }
}
interface Ui {
  speed: number;
  auto: boolean;
  /** 대화창 그림: 식객 일러스트(true) 또는 도트 얼굴(false) */
  portraits: boolean;
  /** 기술을 쓸 때 일러스트 컷인 */
  cutins: boolean;
}
function loadUi(): Ui {
  try {
    return { speed: 1, auto: false, portraits: true, cutins: true, ...JSON.parse(localStorage.getItem(UI_KEY) ?? '{}') };
  } catch {
    return { speed: 1, auto: false, portraits: true, cutins: true };
  }
}

export function App() {
  const [g, setG] = useState<Game | null>(null);
  const [fx, setFx] = useState<Effect | null>(null);
  const [ui, setUiState] = useState<Ui>(loadUi);
  const [menu, setMenu] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [fading, setFading] = useState(false);
  const [error, setError] = useState('');
  const [hasSave, setHasSave] = useState(() => !!load());
  const [adult, setAdult] = useState(adultConfirmed);
  const [refused, setRefused] = useState(false);

  const setUi = (next: Partial<Ui>) =>
    setUiState((cur) => {
      const v = { ...cur, ...next };
      try {
        localStorage.setItem(UI_KEY, JSON.stringify(v));
      } catch {
        /* 이번 접속에만 적용 */
      }
      return v;
    });

  const run = useCallback((game: Game, input?: Input) => {
    try {
      const r = step(game, input);
      setG(r.g);
      setFx(r.fx);
      save(r.g);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, []);

  const advance = (input: Input = { k: 'ok' }) => g && run(g, input);

  // 맵을 옮길 때는 어둡게 닫았다가 연다
  useEffect(() => {
    if (fx?.k !== 'warp' || !g) return;
    setFading(true);
    const t = setTimeout(() => {
      run(g, { k: 'ok' });
      setFading(false);
    }, 380 / ui.speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx]);

  // 손쉬운 승리는 잠깐 보여 주고 지나간다
  useEffect(() => {
    if (fx?.k !== 'swift' || !g) return;
    play('win');
    const t = setTimeout(() => run(g, { k: 'ok' }), 1300 / ui.speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx]);

  // 배경음: 전투 중엔 전투 가락, 아니면 맵 분위기
  useEffect(() => {
    if (!g) {
      setMood('home');
      return;
    }
    setMood(fx?.k === 'battle' ? 'battle' : g.night ? 'story' : MAPS[g.map].bgm);
  }, [g, fx]);

  const [, setSoundTick] = useState(0);
  useEffect(() => onSoundChange(() => setSoundTick((t) => t + 1)), []);

  if (error)
    return (
      <div className="app">
        <div className="center">
          <div className="card">
            <h2>진행이 멈췄어요</h2>
            <p>{error}</p>
            <button
              className="opt primary"
              style={{ width: '100%' }}
              onClick={() => {
                setError('');
                run(newGame());
              }}
            >
              처음부터
            </button>
          </div>
        </div>
      </div>
    );

  if (!g)
    return (
      <div className="app">
        <div className="title">
          <div className="row" style={{ gap: 4 }}>
            <Sprite c="baekseol" scale={5} />
            <Sprite c="me" scale={5} />
            <Sprite c="muyeong" scale={5} />
          </div>
          <h1>왕도</h1>
          <p className="sub">
            빚 받으러 왕까지
            <br />
            시제품 · 1부 1~3화 (25분 안팎)
          </p>
          {!adult ? (
            <div className="opts">
              {refused ? (
                <p className="sub">죄송해요. 이 게임은 성인만 이용할 수 있어요.</p>
              ) : (
                <>
                  <p className="sub" style={{ lineHeight: 1.6 }}>
                    <span className="adult-mark">19</span>
                    <br />
                    성인을 위한 관능적인 장면과 표현이 담겨 있어요.
                    <br />만 19세 이상만 이용할 수 있어요.
                  </p>
                  <button
                    className="opt primary"
                    onClick={() => {
                      try {
                        localStorage.setItem(ADULT_KEY, '1');
                      } catch {
                        /* 저장이 막혀 있으면 다음에 또 묻는다 */
                      }
                      setAdult(true);
                    }}
                  >
                    만 19세 이상이에요
                  </button>
                  <button className="opt" style={{ textAlign: 'center' }} onClick={() => setRefused(true)}>
                    아니에요
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="opts">
              <button className="opt primary" onClick={() => run(newGame())}>
                처음부터
              </button>
              {hasSave && (
                <button className="opt" onClick={() => run(load() ?? newGame())}>
                  이어서
                </button>
              )}
            </div>
          )}
          <p className="credit">파티는 이야기를 따라 알아서 걷고 싸웁니다. 갈림길·들를 곳·장비·대사 선택만 고르세요.
            <br />
            그림: Ninja Adventure(pixel-boy, CC0)를 조선풍으로 고쳐 씀</p>
        </div>
      </div>
    );

  if (fx?.k === 'end')
    return (
      <div className="app">
        <div className="end">
          <h2>시제품은 여기까지</h2>
          <p className="gear">1부 3화 '고갯길의 도깨비'까지 왔습니다.</p>
          <h3 className="name" style={{ marginTop: 16 }}>
            내가 고른 길
          </h3>
          <ul>
            {g.log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <PartyList party={g.party} />
          <p className="coin">엽전 {g.coin}냥</p>
          <div className="next">
            <b>다음 화 · 우렁각시의 밥상</b>
            <br />
            오두막에 사흘째 밥상이 차려져 있다. 차린 사람은 보이지 않는다.
          </div>
          <div className="opts">
            <button
              className="opt primary"
              onClick={() => {
                try {
                  localStorage.removeItem(SAVE_KEY);
                } catch {
                  /* 무시 */
                }
                setHasSave(false);
                run(newGame());
              }}
            >
              다른 선택으로 처음부터
            </button>
          </div>
        </div>
      </div>
    );

  const panel = (() => {
    if (!fx) return null;
    switch (fx.k) {
      case 'talk':
        return <Dialogue key={JSON.stringify(fx.lines).slice(0, 80) + g.pc + (g.reply ? 'r' : '')} lines={fx.lines} speed={ui.speed} auto={ui.auto} portraits={ui.portraits} onDone={() => advance()} />;
      case 'choice':
        return <Choice key={g.pc + fx.prompt + fx.options.length} fx={fx} g={g} onPick={(i) => advance({ k: 'pick', i })} />;
      case 'gift':
        return <Gift key={g.pc} fx={fx} g={g} onPick={(i) => advance({ k: 'pick', i })} />;
      case 'collect':
        return <Collect fx={fx} onDone={(ids) => advance({ k: 'collect', ids })} />;
      case 'shop':
        return (
          <Shop
            g={g}
            onBuy={(item, who) => {
              const next = buy(g, item, who);
              setG(next);
              save(next);
            }}
            onDone={() => advance()}
          />
        );
      case 'join':
        return <Join who={fx.who} portraits={ui.portraits} learned={g.skills.includes(fx.who)} onDone={() => advance()} />;
      case 'skill':
        return <SkillGet key={g.pc} who={fx.who} text={fx.text} cutins={ui.cutins} onDone={() => advance()} />;
      case 'defeat':
        return <Defeat onTrain={() => advance({ k: 'train' })} onRetry={() => advance({ k: 'retry' })} />;
      case 'cutscene':
        return <DebtScroll lines={fx.lines} speed={ui.speed} onDone={() => advance()} />;
      case 'swift':
        return (
          <div className="toast">
            {josa(fx.group.name, '을', '를')} 가볍게 물리쳤다
            <br />
            <span className="gear">
              경험치 +{fx.reward.exp} · 엽전 +{fx.reward.coin}
            </span>
          </div>
        );
      default:
        return null;
    }
  })();

  const busy = fx?.k === 'walk' || fx?.k === 'warp';

  return (
    <div className="app">
      <Field g={g} fx={fx} speed={ui.speed} onWalked={() => advance()} />
      <div className="hud">
        <span className="pill goal">
          <b>{MAPS[g.map].name}</b>
          {g.goal}
        </span>
        <span className="pill coin">{g.coin}냥</span>
        <button className="icon-btn" aria-label="메뉴" onClick={() => setMenu(true)}>
          ☰
        </button>
      </div>
      {busy && (
        <div className="speed">
          {[1, 2, 4].map((s) => (
            <button key={s} className={ui.speed === s ? 'on' : ''} onClick={() => setUi({ speed: s })}>
              ×{s}
            </button>
          ))}
        </div>
      )}
      {panel}
      {fx?.k === 'battle' && <Battle key={g.pc + ':' + g.wins} fx={fx} speed={ui.speed} cutins={ui.cutins} onSpeed={(s) => setUi({ speed: s })} onDone={() => advance()} />}
      {fading && <div className="fade" />}
      {!fading && <div className="fade out" key={g.map + (g.night ? 'n' : 'd')} />}
      {menu && (
        <div className="menu">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>파티</h3>
            <button className="icon-btn" aria-label="닫기" onClick={() => setMenu(false)}>
              ✕
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <PartyList party={g.party} />
          </div>
          <h3>진행</h3>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {[1, 2, 4].map((s) => (
              <button key={s} className={`toggle ${ui.speed === s ? 'on' : ''}`} onClick={() => setUi({ speed: s })}>
                ×{s}
              </button>
            ))}
            <button className={`toggle ${ui.auto ? 'on' : ''}`} onClick={() => setUi({ auto: !ui.auto })}>
              대사 자동 넘김
            </button>
          </div>
          <h3>대화창 그림</h3>
          <div className="row">
            <button className={`toggle ${ui.portraits ? 'on' : ''}`} onClick={() => setUi({ portraits: true })}>
              일러스트
            </button>
            <button className={`toggle ${ui.portraits ? '' : 'on'}`} onClick={() => setUi({ portraits: false })}>
              도트 얼굴
            </button>
          </div>
          <h3>기술 컷인</h3>
          <div className="row">
            <button className={`toggle ${ui.cutins ? 'on' : ''}`} onClick={() => setUi({ cutins: true })}>
              켜기
            </button>
            <button className={`toggle ${ui.cutins ? '' : 'on'}`} onClick={() => setUi({ cutins: false })}>
              끄기
            </button>
          </div>
          <h3>소리</h3>
          <div className="row">
            <button className={`toggle ${soundSettings().bgm ? 'on' : ''}`} onClick={() => setSound({ bgm: !soundSettings().bgm })}>
              배경음
            </button>
            <button className={`toggle ${soundSettings().sfx ? 'on' : ''}`} onClick={() => setSound({ sfx: !soundSettings().sfx })}>
              효과음
            </button>
          </div>
          <h3>기록</h3>
          <p className="gear" style={{ lineHeight: 1.6 }}>
            {g.log.length ? g.log.join(' · ') : '아직 고른 것이 없다.'}
            <br />
            {g.party.map((m) => `${MEMBER_NAME[m.id]} Lv${m.level}`).join(' · ')}
          </p>
          <div className="opts" style={{ marginTop: 16 }}>
            {resetAsk ? (
              <>
                <p className="gear" style={{ margin: 0 }}>
                  지금 진행이 지워집니다. 정말 처음부터 할까요?
                </p>
                <button
                  className="opt primary"
                  onClick={() => {
                    setResetAsk(false);
                    setMenu(false);
                    run(newGame());
                  }}
                >
                  처음부터 다시 하기
                </button>
                <button className="opt" onClick={() => setResetAsk(false)}>
                  그대로 이어 하기
                </button>
              </>
            ) : (
              <button className="opt" onClick={() => setResetAsk(true)}>
                처음부터 다시
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
