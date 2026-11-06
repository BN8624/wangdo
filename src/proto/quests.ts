// 마을 의뢰(2026-11-06, 1부 완성형 볼륨 2단계).
// 오두막의 하루에서 '의뢰판 보기'를 고르면 { t: 'board' }가 그날까지 열린 의뢰 가운데 셋을 보여 준다.
// 의뢰는 짧은 이야기 + 협상·싸움·선택 하나 + 보상. 받으면 깃발 q_<id>를 세우고, 끝나면 ret으로 의뢰판 자리로 돌아온다.
import type { NegoBeat } from './nego';
import type { Beat } from './runner';
import type { Line } from './types';

const n = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'narration', text, ...extra });
const me = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'me', text, ...extra });
const bs = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'baekseol', text, ...extra });
const mu = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'muyeong', text, ...extra });
const sd = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'sodam', text, ...extra });
const npc = (name: string, face: Line['face'], text: string, extra: Partial<Line> = {}): Line => ({ who: `npc:${name}`, face, text, ...extra });

export interface Quest {
  id: string;
  /** 이 오두막의 하루(dayN)부터 의뢰판에 뜬다 */
  day: number;
  title: string;
  /** 의뢰판에 보이는 한 줄 */
  desc: string;
}

export const QUESTS: Quest[] = [
  { id: 'raccoon', day: 2, title: '장독 깨는 너구리', desc: '주막 영감: 밤마다 장독대가 털린다 · 싸움' },
  { id: 'axe', day: 2, title: '빌려 간 도끼', desc: '나무꾼 돌쇠: 송씨 머슴이 도끼를 안 돌려준다 · 협상' },
  { id: 'straw', day: 2, title: '짚신 장수의 외상', desc: '짚신 장수: 외상값을 받아 달라 · 선택' },
  { id: 'sign', day: 3, title: '고갯길 길표', desc: '마을 어른들: 고갯길 길표를 다시 세워 달라 · 싸움' },
  { id: 'goblin_debt', day: 3, title: '도깨비 젊은이의 빚', desc: '떡장수 아낙: 흑운채 젊은이가 떡값을 안 낸다 · 선택' },
  { id: 'lamp', day: 3, title: '등잔 기름 도둑', desc: '과부댁: 밤마다 등잔 기름이 줄어든다 · 싸움' },
  { id: 'stone', day: 4, title: '다듬잇돌', desc: '우물가 아낙: 송씨 머슴이 다듬잇돌을 가져갔다 · 협상' },
  { id: 'scale', day: 4, title: '속이는 저울', desc: '생선 장수: 남의 저울을 의심받아 억울하다 · 선택' },
  { id: 'gamble', day: 4, title: '머슴들의 노름판', desc: '마을 아낙: 남편 품삯이 노름판으로 샌다 · 싸움' },
  { id: 'loot', day: 5, title: '소매치기 장물', desc: '장터 상인들: 털린 물건을 되찾아 달라 · 싸움' },
  { id: 'bribe', day: 5, title: '아전의 뒷돈', desc: '관아 아전: 장날 자릿세를 두 번 걷었다 · 협상' },
  { id: 'groom', day: 5, title: '과부댁 사위 찾기', desc: '과부댁: 딸 혼처를 알아봐 달라 · 선택' },
  { id: 'granary', day: 6, title: '창고 너구리 떼', desc: '창고 관리인: 반환 곡식 창고에 너구리가 든다 · 싸움' },
  { id: 'wages', day: 6, title: '일꾼들의 품삯', desc: '송씨 일꾼들: 창고 일 품삯을 못 받았다 · 협상' },
  { id: 'herbs', day: 6, title: '약초꾼 할멈', desc: '과부댁: 뒷산 약초를 캐러 갈 호위 · 싸움' },
  { id: 'ferryfare', day: 7, title: '나룻배 삯', desc: '나루 사공: 왈패가 뱃삯을 뜯어 간다 · 싸움' },
  { id: 'salt', day: 7, title: '소금 상인의 흥정', desc: '마을 아낙들: 소금값이 너무 비싸다 · 협상' },
  { id: 'lostchild', day: 7, title: '갈대밭의 아이', desc: '나루 인부: 독사 잔당 아이가 숨어 산다 · 선택' },
  { id: 'greens', day: 8, title: '산나물 값', desc: '먹쇠: 마을 사람들이 산나물을 헐값에 사 간다 · 협상' },
  { id: 'fence', day: 8, title: '철곰이 부순 울타리', desc: '과부댁: 철곰이 울타리를 부수고 갔다 · 선택' },
  { id: 'spar', day: 8, title: '보초들의 대련', desc: '흑운채 보초: 진 쪽이 술을 산다 · 싸움' },
  { id: 'thief', day: 9, title: '별창 곡식 도둑', desc: '윤서경: 별창 곡식이 밤마다 준다 · 싸움' },
  { id: 'letter', day: 9, title: '남지후의 편지', desc: '남지후: 편지 한 통을 송채령에게 · 선택' },
  { id: 'shadow', day: 10, title: '무늬 없는 단검', desc: '마을 어른들: 밤에 복면들이 어슬렁거린다 · 싸움' },
  { id: 'heirloom', day: 10, title: '송씨 가문의 노리개', desc: '송채령: 쫓겨난 종에게 노리개를 돌려주고 싶다 · 선택' },
  { id: 'elders', day: 10, title: '마을 어른들의 추천서', desc: '마을 어른들: 현감 후보 추천서에 쓸 말 · 선택' },
];

const nego = (b: Omit<NegoBeat, 't'>): NegoBeat => ({ t: 'nego', ...b });
const start = (id: string, lines: Line[]): Beat[] => [{ t: 'label', name: `q_${id}` }, { t: 'talk', lines }];
const fight = (foe: string, lines: Line[]): Beat[] => [{ t: 'walk', to: '남쪽 어귀', face: 0 }, { t: 'talk', lines }, { t: 'battle', foe }];
const done: Beat[] = [{ t: 'walk', to: '마을 한가운데' }, { t: 'ret' }];

export const QUEST_BEATS: Beat[] = [
  // ── 2화 뒤 ──
  ...start('raccoon', [
    npc('주막 영감', 'innkeeper', '밤마다 장독대가 털리네. 된장독 뚜껑이 다 열려 있고, 발자국은 요만해.'),
    bs('너구리예요. 여우 체면에 너구리한테 지면 안 되죠.'),
  ]),
  ...fight('q_raccoons', [n('남쪽 어귀 덤불에서 너구리 셋이 된장을 묻힌 주둥이로 나타났다.'), bs('어머, 된장 냄새. 저것들 배가 불러서 느려요.')]),
  { t: 'talk', lines: [npc('주막 영감', 'innkeeper', '허허, 장독이 살았네. 외상에서 서른 냥 까 주지. 아니, 그냥 서른 냥 주지.'), n('엽전 서른 냥을 받았다. 외상은 그대로였다.')] },
  { t: 'coin', n: 30 },
  ...done,

  ...start('axe', [
    npc('돌쇠', 'worker2', '형님, 송씨 머슴 놈이 내 도끼를 빌려 가서 안 돌려주오. 그게 우리 아버지 도끼란 말이오.'),
    me('나무꾼한테 도끼를 안 돌려준다고. 그건 빚 중에 제일 나쁜 빚이오.'),
  ]),
  nego({
    id: 'q_axe',
    who: '송씨 머슴',
    face: 'thug',
    prompt: '도끼를 깔고 앉은 송씨 머슴. 세 번 안에 도끼를 돌려받자.',
    resolve: 50,
    turns: 3,
    tools: ['bat', 'charm', 'coin'],
    mods: { charm: 1.3, coin: 1.2 },
    react: [npc('송씨 머슴', 'thug', '빌린 거 아니고 받은 거요!'), npc('송씨 머슴', 'thug', '……대감 댁 장작 패려고 그런 거요.'), npc('송씨 머슴', 'thug', '아, 가져가쇼, 가져가!')],
    win: { flag: 'q_axe_won', log: '돌쇠의 도끼를 돌려받았다', lines: [n('머슴이 도끼를 내던지고 달아났다.'), npc('돌쇠', 'worker2', '형님! 이 도끼, 형님이 쓰시오. 나보다 형님이 잘 쓸 거요.')] },
    lose: { flag: 'q_axe_lost', log: '돌쇠의 도끼는 엽전을 주고 사 왔다', coin: -20, lines: [n('결국 엽전 스무 냥을 쥐여 주고 도끼를 받아 왔다.'), npc('돌쇠', 'worker2', '……형님, 고맙소. 이 도끼, 형님이 쓰시오. 값은 그걸로 치겠소.')] },
  }),
  { t: 'give', item: 'oldaxe', from: '돌쇠의 손도끼' },
  ...done,

  ...start('straw', [
    npc('짚신 장수', 'worker2', '이 장부 좀 보시오. 고개 너머 박 서방이 짚신 스무 켤레 외상을 석 달째 안 갚소.'),
    n('짚신 장수를 따라 박 서방네에 가 보니, 다리를 다친 사내가 짚신을 삼고 있었다. 그 짚신을 팔아 갚겠다고 했다.'),
    bs('나리, 받을 거예요? 저 짚신 다 팔려면 겨울 지나요.'),
  ]),
  {
    t: 'choice',
    id: 'q_straw',
    prompt: '짚신 스무 켤레 외상',
    options: [
      { text: '반은 내가 갚고 반은 봄에 받자', desc: '엽전 20냥', coin: -20, bond: { baekseol: 4 }, flag: 'q_straw_half', log: '박 서방 짚신 외상 반을 대신 갚았다', reply: [npc('짚신 장수', 'worker2', '……참봉도 아닌 나무꾼이 그런 셈을 다 하는구먼.'), bs('나리, 그 셈법은 손해예요. 근데 좋은 손해예요.')] },
      { text: '삼은 짚신으로 받아 가시오', desc: '돈 대신 물건', flag: 'q_straw_goods', log: '박 서방 외상을 짚신으로 받게 했다', reply: [n('짚신 장수는 투덜대며 짚신 열 켤레를 받아 갔다. 박 서방이 그중 제일 튼튼한 한 켤레를 내게 쥐여 주었다.')] },
    ],
  },
  { t: 'coin', n: 15 },
  ...done,

  // ── 3화 뒤 ──
  ...start('sign', [
    npc('마을 어른', 'innkeeper', '고갯길 길표가 넘어진 지 오래네. 고개를 넘는 사람마다 길을 잃어. 졸개들이 길목에 눌러앉아 손을 못 대고 있다네.'),
    mu('……흑운채 떠돌이 졸개들이오. 산채에서도 쫓겨난 놈들이오.'),
  ]),
  ...fight('passTrain', [n('남쪽 어귀 너머 고갯길 입구. 떠돌이 졸개 하나가 도깨비불을 끌고 길표 위에 걸터앉아 있었다.'), mu('비키시오. 길표 세우러 왔소.')]),
  { t: 'talk', lines: [n('길표를 다시 세웠다. 무영이 한 손으로 기둥을 박아 넣었다. 마을 어른들이 엽전 마흔 냥을 모아 주었다.')] },
  { t: 'coin', n: 40 },
  ...done,

  ...start('goblin_debt', [
    npc('떡장수 아낙', 'worker', '흑운채 젊은 놈이 떡을 사 가고 값을 안 내. 뿔 달린 걸 보니 무섭기도 하고.'),
    n('젊은 도깨비는 장터 구석에 쭈그려 앉아 있었다. 떡은 한 입도 안 먹은 채 보따리에 싸 두고.'),
    npc('젊은 도깨비', 'bandit', '……산채에 동생이 있소. 그 애 주려고. 돈은 없소.'),
    mu('…….'),
  ]),
  {
    t: 'choice',
    id: 'q_goblin_debt',
    prompt: '떡값을 못 낸 젊은 도깨비',
    options: [
      { text: '무영에게 맡긴다', desc: '산채 사람 일은 산채 사람이', bond: { muyeong: 6 }, flag: 'q_goblin_mu', log: '도깨비 젊은이의 떡값 일을 무영에게 맡겼다', reply: [mu('……떡값은 내가 내겠소. 대신 너는 떡장수 아낙 장작을 한 달 패라.'), npc('젊은 도깨비', 'bandit', '……네, 선봉 누님.'), n('무영은 그 뒤로 한참 장터 쪽을 돌아보았다.')] },
      { text: '떡장수에게 일을 시키게 한다', desc: '빚은 일로 갚는다', bond: { muyeong: 3 }, flag: 'q_goblin_work', log: '도깨비 젊은이에게 떡값을 일로 갚게 했다', reply: [npc('떡장수 아낙', 'worker', '뿔 달린 일꾼이라. 밀가루 포대 나르는 데는 그만이겠네.'), npc('젊은 도깨비', 'bandit', '……고맙소, 나리.')] },
    ],
  },
  { t: 'coin', n: 20 },
  ...done,

  ...start('lamp', [npc('과부댁', 'widow', '참봉…… 아니, 나무꾼 양반. 밤마다 등잔 기름이 반씩 줄어. 도둑 발자국도 없고.'), bs('도깨비불이에요. 기름을 핥아먹거든요. 귀엽지만 얄미워요.')]),
  { t: 'night', on: true },
  ...fight('q_wisps', [n('밤, 남쪽 어귀 덤불 위로 푸른 불 셋이 둥실 떠올랐다. 셋 다 기름 냄새를 풍겼다.'), mu('불을 방망이로 치는 건 처음이오.')]),
  { t: 'night', on: false },
  { t: 'talk', lines: [npc('과부댁', 'widow', '아이고, 이제 등잔 걱정 덜었네. 이거 받아. 도깨비불 쫓은 데 쓰는 방울이래.'), n('과부댁이 낡은 방울 하나를 내밀었다. 흔들자 맑은 소리가 났다.')] },
  { t: 'give', item: 'dokbell', from: '과부댁의 도깨비 방울' },
  ...done,

  // ── 4화 뒤 ──
  ...start('stone', [npc('우물가 아낙', 'worker', '송씨 댁 머슴이 우리 다듬잇돌을 가져갔어요. 대감 댁 빨래 두드릴 거라나.'), sd('그 다듬잇돌, 제가 송씨 댁에서 봤어요. 대감 댁 것도 아닌데 부엌 뒤에 있었어요.')]),
  nego({
    id: 'q_stone',
    who: '송씨 머슴',
    face: 'thug',
    prompt: '다듬잇돌을 깔고 앉은 머슴. 세 번 안에 돌려받자.',
    resolve: 60,
    turns: 3,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { ledger: 1.4, threat: 1.2 },
    react: [npc('송씨 머슴', 'thug', '대감 댁 거요!'), npc('송씨 머슴', 'thug', '……그, 그래도 내가 가져온 건 아니오.'), npc('송씨 머슴', 'thug', '아, 가져가쇼!')],
    win: { flag: 'q_stone_won', log: '우물가 아낙의 다듬잇돌을 돌려받았다', coin: 30, lines: [npc('우물가 아낙', 'worker', '아이고 고마워라. 이거 받아요, 빨래 삯 모아 둔 거예요.')] },
    lose: { flag: 'q_stone_lost', log: '다듬잇돌은 결국 새로 사 주었다', coin: -10, lines: [n('결국 장터에서 새 다듬잇돌을 사 주었다.'), npc('우물가 아낙', 'worker', '……새 거라 더 좋네요. 고마워요.')] },
  }),
  ...done,

  ...start('scale', [npc('생선 장수', 'worker2', '아낙들이 내 저울이 속인다고 생선을 안 사 가오. 나는 억울하오. 저울은 송씨 댁에서 빌려 쓰는 거란 말이오.'), sd('……그 저울, 송씨 댁 저울이면 한 근에 두 냥씩 속여요. 제가 열 해 동안 봤어요.')]),
  {
    t: 'choice',
    id: 'q_scale',
    prompt: '송씨 댁에서 빌린 저울',
    options: [
      { text: '소담에게 저울을 고쳐 달라 한다', desc: '추를 다시 맞춘다', bond: { sodam: 6 }, flag: 'q_scale_fixed', log: '소담이 생선 장수의 저울추를 바로잡았다', reply: [n('소담이 저울추 밑에 붙은 납 조각을 손톱으로 떼어 냈다. 한 근이 정말 한 근이 되었다.'), npc('생선 장수', 'worker2', '……이걸 열 해 동안 몰랐다니.'), sd('이 납 조각은 장부에 증거로 붙여 둘게요.')] },
      { text: '마을 저울을 새로 맞춘다', desc: '엽전 30냥, 마을 한가운데 공용 저울', coin: -30, bond: { sodam: 3 }, flag: 'q_scale_new', log: '마을 한가운데 공용 저울을 맞춰 두었다', reply: [n('마을 한가운데 공용 저울이 걸렸다. 아낙들이 생선을 들고 줄을 섰다.'), sd('……나리. 그 저울, 송씨 댁보다 정직해요.')] },
    ],
  },
  { t: 'give', item: 'scalepin', from: '저울추 노리개' },
  ...done,

  ...start('gamble', [npc('마을 아낙', 'worker', '우리 영감 품삯이 송씨 머슴들 노름판으로 다 새요. 판을 엎어 주세요.'), mu('노름판이면 몽둥이가 빠르오.')]),
  ...fight('meoTrain', [n('남쪽 어귀 헛간 뒤. 송씨 머슴 둘이 투전 패를 펼쳐 놓고 있었다.'), sd('판돈 장부도 있네요. 그것부터 챙길게요.')]),
  { t: 'talk', lines: [n('판돈은 집집마다 돌려주었다. 아낙들이 남은 엽전을 모아 쥐여 주었다.'), sd('판돈 장부는 나중에 쓸 데가 있을 거예요.')] },
  { t: 'coin', n: 50 },
  ...done,

  // ── 5화 뒤 ──
  ...start('loot', [npc('떡장수 아낙', 'worker', '장날에 털린 물건들이 남쪽 어귀 헛간에 쌓여 있대요. 소매치기 잔당이 지키고요.')]),
  ...fight('pickTrain', [n('헛간 앞에 소매치기 둘이 장물 보따리를 깔고 앉아 있었다.'), bs('장날에 못다 한 인사 마저 해야죠.')]),
  { t: 'talk', lines: [n('장물은 주인을 찾아 돌려주었다. 주인을 못 찾은 단도 한 자루가 남았다.'), mu('……쓸 만하오. 임자가 가지시오.')] },
  { t: 'give', item: 'pickdagger', from: '주인 없는 단도' },
  ...done,

  ...start('bribe', [npc('관아 아전', 'ajeon', '이건 비밀인데…… 장날 자릿세를 우리 형방이 두 번 걷었소. 나는 말렸는데. 정말이오.'), sd('……장부엔 한 번만 적혀 있어요. 나머지는 어디 갔을까요.')]),
  nego({
    id: 'q_bribe',
    who: '관아 형방',
    face: 'ajeon',
    prompt: '두 번 걷은 자릿세. 세 번 안에 형방에게서 돌려받자.',
    resolve: 80,
    turns: 3,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { ledger: 1.6, threat: 0.6, coin: 0 },
    react: [npc('관아 형방', 'ajeon', '나는 모르는 일이오.'), npc('관아 형방', 'ajeon', '……장부가 왜 그쪽 손에 있소.'), npc('관아 형방', 'ajeon', '돌려주겠소. 소문만 내지 마시오.')],
    win: { flag: 'q_bribe_won', log: '형방이 두 번 걷은 자릿세를 돌려받았다', coin: 60, lines: [n('형방이 엽전 꾸러미를 내놓았다. 장꾼들 몫은 소담이 하나하나 나눠 주었다.'), sd('남는 건 수고비로 받을게요. 장부엔 정직하게 적어요.')] },
    lose: { flag: 'q_bribe_lost', log: '형방은 자릿세를 끝내 내놓지 않았다', lines: [npc('관아 형방', 'ajeon', '증거가 없잖소. 돌아가시오.'), sd('……괜찮아요. 이 장부, 심리 때 다시 펴요.')] },
  }),
  ...done,

  ...start('groom', [npc('과부댁', 'widow', '우리 딸 혼처 좀 알아봐 주시우. 착한 놈이면 돼. 노름 안 하고 술 덜 먹고.'), bs('어머, 중매요? 여우가 중매하면 백년해로해요.'), sd('……착한 놈이면 마을에 몇 없어요. 장부에 다 있어요.')]),
  {
    t: 'choice',
    id: 'q_groom',
    prompt: '과부댁 딸의 혼처',
    options: [
      { text: '돌쇠를 추천한다', desc: '도끼를 아끼는 나무꾼', bond: { baekseol: 3 }, flag: 'q_groom_dolsoe', log: '과부댁 딸 혼처로 돌쇠를 추천했다', reply: [npc('과부댁', 'widow', '돌쇠? 그 나무꾼? ……도끼 아끼는 놈이면 마누라도 아끼겠지.'), bs('봐요, 여우 중매는 틀린 적이 없어요.')] },
      { text: '생선 장수를 추천한다', desc: '저울을 바로잡은 사내', bond: { sodam: 3 }, flag: 'q_groom_fish', log: '과부댁 딸 혼처로 생선 장수를 추천했다', reply: [npc('과부댁', 'widow', '생선 장수? 비린내는 나도 정직하다며?'), sd('한 근이 한 근인 사람이에요. 그거면 돼요.')] },
    ],
  },
  { t: 'talk', lines: [npc('과부댁', 'widow', '혼례 날 떡은 내가 넉넉히 하리다. 이건 중매 삯.'), n('과부댁이 씨암탉 한 마리와 엽전 마흔 냥을 내밀었다.')] },
  { t: 'coin', n: 40 },
  ...done,

  // ── 6화 뒤 ──
  ...start('granary', [npc('창고 관리인', 'keeper', '……나리. 반환 곡식 창고에 너구리 떼가 들었소. 송씨 댁 시절엔 내가 몽둥이로 쫓았는데, 이젠 그럴 처지가 아니라.'), mu('너구리는 몽둥이로 쫓아도 되오.')]),
  ...fight('q_raccoons2', [n('창고 뒤 개구멍으로 살진 너구리 셋이 곡식 자루를 끌고 나오고 있었다.'), sd('저 자루 하나에 열일곱 집 중 한 집 겨울이 걸려 있어요!')]),
  { t: 'talk', lines: [npc('창고 관리인', 'keeper', '……고맙소. 이건 내가 송씨 댁에서 몰래 모아 둔 엽전이오. 이제 쓸 데가 없소.')] },
  { t: 'coin', n: 70 },
  ...done,

  ...start('wages', [npc('송씨 일꾼', 'thug', '창고 일 품삯을 석 달째 못 받았소. 송씨 댁 집사는 반환 곡식 때문에 돈이 없다나.'), sd('반환 곡식이랑 품삯은 다른 장부예요. 핑계예요.')]),
  nego({
    id: 'q_wages',
    who: '송씨 댁 청지기',
    face: 'keeper',
    prompt: '석 달 치 품삯을 미루는 송씨 댁 청지기. 세 번 안에 받아 내자.',
    resolve: 90,
    turns: 3,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { ledger: 1.5, bat: 1.2, coin: 0.6 },
    react: [npc('송씨 댁 청지기', 'keeper', '돈이 없다니까.'), npc('송씨 댁 청지기', 'keeper', '……강 집사 어른께 여쭤봐야 하오.'), npc('송씨 댁 청지기', 'keeper', '내, 내드리겠소!')],
    win: { flag: 'q_wages_won', log: '송씨 일꾼들의 석 달 치 품삯을 받아 냈다', coin: 50, lines: [n('품삯이 일꾼들 손에 쥐어졌다. 일꾼들이 모아 수고비를 내밀었다.'), npc('송씨 일꾼', 'thug', '……송씨 댁 일꾼이 나리한테 고맙단 말을 할 줄은 몰랐소.')] },
    lose: { flag: 'q_wages_lost', log: '송씨 일꾼들의 품삯은 반만 받아 냈다', lines: [n('청지기는 반만 내놓았다.'), sd('나머지 반은 장부에 달아 둘게요. 받을 날이 와요.')] },
  }),
  ...done,

  ...start('herbs', [npc('과부댁', 'widow', '옆집 할멈이 뒷산에 약초 캐러 가야 하는데, 요즘 도깨비불이 들끓어. 호위 좀 해 주시우.')]),
  ...fight('q_wisps2', [n('뒷산 약초밭. 할멈이 도라지를 캐는 동안 도깨비불 무리가 몰려왔다.'), bs('여우가 지키는 약초밭에 불장난이라니.')]),
  { t: 'talk', lines: [npc('약초꾼 할멈', 'widow', '고마우이. 이 약초 주머니, 허리에 차고 다니면 다친 데가 빨리 아물어.')] },
  { t: 'give', item: 'herbpouch', from: '약초 주머니' },
  ...done,

  // ── 7화 뒤 ──
  ...start('ferryfare', [npc('나루 사공', 'worker2', '독사가 잡혀가도 왈패들이 뱃삯을 뜯어 가오. 손님들이 나루를 피하오.')]),
  ...fight('ferryTrain', [n('남쪽 어귀까지 나루 왈패 둘이 뱃삯 꾸러미를 메고 오고 있었다.'), mu('뜯은 뱃삯, 그대로 내려놓고 가시오.')]),
  { t: 'talk', lines: [npc('나루 사공', 'worker2', '이제 손님이 돌아오겠소. 이건 사례요. 그리고 이 노는…… 아버지가 쓰던 거요. 무기로도 쓸 만할 거요.')] },
  { t: 'coin', n: 40 },
  { t: 'give', item: 'oar', from: '사공의 노' },
  ...done,

  ...start('salt', [npc('마을 아낙', 'worker', '소금 배 상인이 소금값을 곱으로 불러요. 김장철인데.'), sd('소금값은 나루 시세의 한 배 반이 넘으면 바가지예요. 이건 두 배예요.')]),
  nego({
    id: 'q_salt',
    who: '소금 배 상인',
    face: 'worker2',
    prompt: '김장철 소금값을 곱으로 부르는 상인. 세 번 안에 깎자.',
    resolve: 80,
    turns: 3,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { ledger: 1.4, charm: 1.3, coin: 1.5, threat: 0.5 },
    react: [npc('소금 배 상인', 'worker2', '김장철엔 원래 비싸오.'), npc('소금 배 상인', 'worker2', '……나루 시세를 어떻게 아시오.'), npc('소금 배 상인', 'worker2', '알았소, 알았소. 제값에 드리리다.')],
    win: { flag: 'q_salt_won', log: '소금 배 상인에게서 김장 소금값을 깎았다', lines: [npc('마을 아낙', 'worker', '이 값이면 김장 두 독은 더 하겠네! 이거 받아요, 소금 주머니. 액막이로 차고 다니래요.')] },
    lose: { flag: 'q_salt_lost', log: '소금값은 조금밖에 못 깎았다', lines: [npc('마을 아낙', 'worker', '그래도 조금 깎였네요. 이거 받아요, 소금 주머니.')] },
  }),
  { t: 'give', item: 'saltpouch', from: '소금 주머니' },
  ...done,

  ...start('lostchild', [npc('나루 인부', 'worker2', '갈대밭에 아이 하나가 숨어 살아요. 독사 잔당 놈들이 데리고 다니던 아이요. 밤마다 나루 주막 찌꺼기를 주워 먹어요.'), bs('……그날 갈대밭에서 숨소리 떨리던 그 아이예요.')]),
  {
    t: 'choice',
    id: 'q_lostchild',
    prompt: '갈대밭의 아이',
    options: [
      { text: '과부댁에 맡긴다', desc: '혼례를 앞둔 집이라 일손이 필요하다', bond: { baekseol: 4, sodam: 2 }, flag: 'q_child_widow', log: '갈대밭 아이를 과부댁에 맡겼다', reply: [n('아이는 백설의 꼬리를 꼭 쥐고서야 갈대밭을 나왔다.'), npc('과부댁', 'widow', '먹는 입 하나 느는 거, 내 딸 시집가면 딱 맞네.')] },
      { text: '흑운채 정착지에 보낸다', desc: '아이들이 많은 곳', bond: { muyeong: 4, baekseol: 2 }, flag: 'q_child_heukun', log: '갈대밭 아이를 흑운채 정착지로 보냈다', reply: [mu('……산채엔 아이들이 많소. 거기선 아무도 굶기지 않겠소. 내가 약속하오.'), n('아이는 무영의 등에 업혀 고개를 넘었다. 한 번도 울지 않았다.')] },
    ],
  },
  { t: 'coin', n: 20 },
  ...done,

  // ── 8화 뒤 ──
  ...start('greens', [npc('먹쇠', 'meoksoe', '참봉. 마을 사람들이 우리 산나물을 반값에 사 가오. 도깨비 거라고. 이래서야 정착이 되겠소.'), mu('……두목, 내가 하겠소.')]),
  nego({
    id: 'q_greens',
    who: '장터 객주',
    face: 'innkeeper',
    prompt: '흑운채 산나물을 반값에 사 가는 장터 객주. 세 번 안에 제값을 받자.',
    resolve: 90,
    turns: 3,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { threat: 0.3, ledger: 1.3, charm: 1.2 },
    react: [npc('장터 객주', 'innkeeper', '도깨비 나물을 누가 제값에 사오.'), npc('장터 객주', 'innkeeper', '……맛은 좋긴 하던데.'), npc('장터 객주', 'innkeeper', '알았소. 제값 쳐 주리다.')],
    win: { flag: 'q_greens_won', log: '흑운채 산나물을 제값에 팔게 했다', coin: 40, lines: [npc('먹쇠', 'meoksoe', '……고맙소. 이건 산채에서 벼린 칼이오. 감사 표시요.'), mu('……두목이 칼을 내주는 건 처음 보오.')] },
    lose: { flag: 'q_greens_lost', log: '산나물 값은 조금만 올렸다', lines: [npc('먹쇠', 'meoksoe', '그래도 반값보다는 낫소. 이건 감사 표시요.')] },
  }),
  { t: 'give', item: 'heukunblade', from: '흑운채 칼' },
  ...done,

  ...start('fence', [npc('과부댁', 'widow', '그 곰 같은 도깨비가! 울타리를 부수고 갔어! 씨암탉이 다 도망갔다고!'), mu('……철곰이오. 산채 사람들 정착지 둘러보러 왔다가.')]),
  {
    t: 'choice',
    id: 'q_fence',
    prompt: '철곰이 부순 울타리',
    options: [
      { text: '철곰에게 고치게 한다', desc: '부순 사람이 고친다', bond: { muyeong: 4 }, flag: 'q_fence_cheolgom', log: '부순 울타리를 철곰에게 고치게 했다', reply: [n('철곰이 투덜대며 울타리를 다시 세웠다. 원래보다 두 배 튼튼했다. 씨암탉도 한 마리씩 다 잡아 왔다.'), npc('철곰', 'cheolgom', '……이 마을은 이상하오. 부수면 고치라고 하고, 고치면 밥을 주오.')] },
      { text: '내가 고쳐 준다', desc: '나무꾼 솜씨', bond: { muyeong: 2, sodam: 2 }, flag: 'q_fence_me', log: '부서진 울타리를 내가 고쳤다', reply: [n('반나절 걸려 울타리를 고쳤다. 무영이 옆에서 말없이 못을 건넸다.'), npc('과부댁', 'widow', '역시 나무꾼 솜씨네. 현감 돼도 이 솜씨는 잊지 마시우.')] },
    ],
  },
  { t: 'coin', n: 30 },
  ...done,

  ...start('spar', [npc('흑운채 보초', 'bandit', '선봉 누님, 대련 한 판 하시오. 진 쪽이 오늘 주막 술값을 내는 거요.'), mu('……임자도 끼시오. 오늘은 봐주지 않겠소.')]),
  ...fight('gateTrain', [n('남쪽 어귀 공터. 흑운채 보초 둘이 몽둥이를 고쳐 쥐었다.'), bs('술값 내기면 이겨야죠. 저 오늘 많이 마실 거예요.')]),
  { t: 'talk', lines: [npc('흑운채 보초', 'bandit', '……졌소. 술값은 우리가 내지. 대신 다음 판도 받아 주시오.'), n('그날 밤 주막은 도깨비와 사람이 한데 섞여 시끄러웠다.')] },
  { t: 'coin', n: 30 },
  ...done,

  // ── 9화 뒤 ──
  ...start('thief', [npc('윤서경', 'yunseo', '별창 곡식이 밤마다 서너 자루씩 줄어듭니다. 서명은 그대로인데. 감독 책임은 참봉에게 있습니다.')]),
  { t: 'night', on: true },
  ...fight('privTrain', [n('밤, 별창으로 가는 남쪽 어귀. 송씨 사병 복면 둘이 곡식 자루를 지고 지나가고 있었다.'), sd('서명은 그대로라니, 안에 손 대는 사람이 있다는 거예요.')]),
  { t: 'night', on: false },
  { t: 'talk', lines: [npc('윤서경', 'yunseo', '……사병들이 감독 서명을 베껴 썼군요. 장부에 적겠습니다. 수고비는 왕실 장부에서.'), sd('서명 베낀 종이는 제가 가질게요. 심리 때 써요.')] },
  { t: 'coin', n: 80 },
  ...done,

  ...start('letter', [npc('남지후', 'namjihu', '참봉 나리, 편지 한 통만 송채령 아가씨께 전해 주시겠습니까? 제가 가면 송씨 댁 대문이 안 열려서요.'), bs('연애편지예요? 장사 편지예요?'), npc('남지후', 'namjihu', '……둘 다라고 해 두죠.')]),
  {
    t: 'choice',
    id: 'q_letter',
    prompt: '남지후의 편지',
    options: [
      { text: '뜯지 않고 전한다', desc: '심부름은 심부름', flag: 'q_letter_sealed', log: '남지후의 편지를 뜯지 않고 송채령에게 전했다', reply: [npc('송채령', 'chaeryeong', '……남지후가요? 받겠습니다. 읽는 건 제 마음이고요.'), n('채령의 귀 끝이 붉었다. 남지후에게 돌아가 그렇게 전하자, 그는 엽전 꾸러미를 통째로 내밀었다.')] },
      { text: '백설에게 봉투를 비춰 보게 한다', desc: '여우 눈에는 다 보인다', bond: { baekseol: 3 }, flag: 'q_letter_peek', log: '남지후의 편지를 백설이 슬쩍 비춰 보았다', reply: [bs('……어머. "아가씨 가문의 배를 사겠습니다. 아가씨도 같이." 이게 장사 편지예요?'), n('편지는 그대로 전했다. 백설은 그날 내내 남지후만 보면 웃었다.')] },
    ],
  },
  { t: 'coin', n: 60 },
  ...done,

  // ── 10화 뒤 ──
  ...start('shadow', [npc('마을 어른', 'innkeeper', '밤마다 복면 쓴 놈들이 마을을 어슬렁거리네. 무늬 없는 단검을 찼다더군.'), mu('……송씨 쪽 냄새요. 먼저 잡읍시다.')]),
  { t: 'night', on: true },
  ...fight('asnTrain', [n('밤, 남쪽 어귀. 복면 둘이 담장 그늘에 붙어 있었다.'), bs('나리, 뒤로 가세요. 저것들 칼끝에 독이 있어요.')]),
  { t: 'night', on: false },
  { t: 'talk', lines: [n('복면들은 단검 하나를 떨어뜨리고 달아났다. 날이 얇고 가벼웠다.'), mu('……좋은 칼이오. 적의 칼은 빼앗아 쓰는 게 예의요.')] },
  { t: 'give', item: 'asndagger', from: '무늬 없는 단검' },
  ...done,

  ...start('heirloom', [npc('송채령', 'chaeryeong', '아버지가 쫓아낸 늙은 찬모가 있습니다. 소담 씨 전에 부엌을 맡던 분이요. 이 노리개를 돌려드리고 싶은데, 제가 가면 받지 않으실 겁니다.'), sd('……박 찬모님이요. 저한테 처음 장부 보는 법을 가르쳐 주신 분이에요.')]),
  {
    t: 'choice',
    id: 'q_heirloom',
    prompt: '송씨 가문의 노리개',
    options: [
      { text: '소담이 전하게 한다', desc: '가르침 받은 사람이 직접', bond: { sodam: 6 }, flag: 'q_heirloom_sodam', log: '송씨 가문의 노리개를 소담이 옛 찬모에게 전했다', reply: [n('박 찬모는 소담을 보자 울었다. 노리개보다 소담을 더 오래 쥐고 있었다.'), npc('송채령', 'chaeryeong', '……고맙습니다. 이건 사례입니다. 저희 가문 물건이지만, 이제 제 물건이니까요.'), sd('……박 찬모님이 저한테 그랬어요. 잘 컸다고.')] },
      { text: '채령에게 같이 가자고 한다', desc: '직접 사과하는 게 맞다', bond: { sodam: 3 }, flag: 'q_heirloom_chae', log: '송채령과 함께 옛 찬모를 찾아갔다', reply: [n('채령은 박 찬모 앞에서 무릎을 꿇었다. 송씨 가문 사람이 그러는 건 처음이라고, 찬모가 말했다.'), npc('송채령', 'chaeryeong', '……참봉. 이건 사례입니다. 오늘 제가 받은 것에 비하면 싸지만요.')] },
    ],
  },
  { t: 'give', item: 'chaenorigae', from: '송채령의 옥노리개' },
  ...done,

  ...start('elders', [npc('마을 어른', 'innkeeper', '조사관이 현감 후보 추천서를 받는다네. 우리 마을 어른들이 써 주기로 했는데, 뭐라고 써 줄까? 자네가 말해 보게.')]),
  {
    t: 'choice',
    id: 'q_elders',
    prompt: '추천서에 적을 한 줄',
    options: [
      { text: '빚을 끝까지 받아 주는 사람', desc: '방망이 주인답게', flag: 'q_elders_debt', log: '추천서에 "빚을 끝까지 받아 주는 사람"이라 적게 했다', reply: [npc('마을 어른', 'innkeeper', '허허, 현감 추천서에 빚쟁이 소리라. 그래도 맞는 말이지.')] },
      { text: '식객 셋의 이름을 함께 적어 주시오', desc: '혼자 한 일이 아니다', bond: { baekseol: 3, muyeong: 3, sodam: 3 }, flag: 'q_elders_four', log: '추천서에 식객 셋의 이름을 함께 적게 했다', reply: [npc('마을 어른', 'innkeeper', '추천서에 이름이 넷이라. 조사관이 웃겠군.'), bs('웃으라죠. 이름이 넷이면 넷이 다 현감이에요.'), mu('……나는 현감은 싫소.'), sd('저는 장부만 맡을게요.')] },
    ],
  },
  { t: 'coin', n: 100 },
  ...done,
];
