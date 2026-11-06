// 새 화 넷(2026-11-06, 1부 완성형 볼륨 3단계). 본편은 오두막의 하루 뒤에 { t: 'call', label: 'ep_*' }로 부르고, 끝나면 ret으로 돌아간다.
//   ep_cave  뒷산 깊은 굴(3화 뒤): 방망이가 묻혀 있던 소나무 밑 굴, 옛 사당의 벽화와 전 주인의 한 줄
//   ep_town  관아의 장부(5화 뒤): 참봉 첫 출근, 형방, 관아 서고의 곡식 이관 장부, 옥에 갇힌 도깨비
//   ep_camp  산채의 겨울(8화 뒤): 무영 어머니의 대장간, 검은바람 습격, 철곰이 같은 편
//   ep_manor 송 대감 댁 잠입(9화 뒤): 소담의 옛 방, 강 집사, 뜯긴 승인란의 해를 두른 용
import type { Beat } from './runner';
import type { Line } from './types';

const n = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'narration', text, ...extra });
const me = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'me', text, ...extra });
const bs = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'baekseol', text, ...extra });
const mu = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'muyeong', text, ...extra });
const sd = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'sodam', text, ...extra });
const npc = (name: string, face: Line['face'], text: string, extra: Partial<Line> = {}): Line => ({ who: `npc:${name}`, face, text, ...extra });

const tactic = (id: string, prompt: string, log: string): Beat => ({
  t: 'choice',
  id,
  prompt,
  party: true,
  options: [
    { text: '몰아쳐라', desc: '공격 ↑, 방어 ↓', tactic: 'push', log: `${log}: 몰아쳐라` },
    { text: '목숨부터', desc: '체력·방어 ↑, 공격 ↓', tactic: 'safe', log: `${log}: 목숨부터` },
    { text: '기술 아끼지 마', desc: '첫 차례부터 기술, 기술 피해 ↑', tactic: 'skill', log: `${log}: 기술 아끼지 마` },
  ],
});

// ───────────── 뒷산 깊은 굴 ─────────────
const CAVE: Beat[] = [
  { t: 'label', name: 'ep_cave' },
  { t: 'night', on: true },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'goal', text: '방망이가 우는 소리' },
  {
    t: 'talk',
    lines: [
      n('고개에서 돌아온 지 사흘째 밤. 방망이가 잠결에 웅웅 울었다. 빚 앞에서 우는 소리와 달랐다. 무언가를 부르는 소리였다.'),
      bs('나리, 방망이가 뒷산 쪽으로 울어요.'),
      mu('……뒷산 늙은 소나무. 임자가 그 방망이를 주운 데요?'),
      me('주운 게 아니라 뿌리 밑에 박혀 있었소.'),
      mu('흑운채에선 그 소나무 밑에 굴이 있다는 이야기가 있소. 들어간 놈은 다 빈손으로 나왔다고.'),
      bs('빈손으로 나왔으면 다행이죠. 손이 없어서 나온 거면 몰라도.'),
    ],
  },
  { t: 'night', on: false },
  { t: 'map', map: 'backhill', at: '마을길', dir: 1 },
  { t: 'walk', to: '늙은 소나무', face: 1, say: [n('새벽. 늙은 소나무 뿌리 사이, 방망이를 뽑아낸 자리에 어른 하나 들어갈 구멍이 나 있었다.')] },
  { t: 'talk', lines: [n('방망이를 구멍 쪽으로 내밀자 손잡이가 따뜻해졌다. 안쪽에서 찬바람이 올라왔다.'), mu('횃불은 내가 들겠소. 임자는 방망이를.'), bs('저는 맨 뒤에 설게요. 여우는 원래 꼬리를 뒤에 두는 거예요.')] },
  { t: 'map', map: 'deepcave', at: '굴 입구', dir: 1 },
  { t: 'goal', text: '굴 끝의 옛 사당' },
  { t: 'rest', train: 'dc_train' },
  { t: 'walk', to: '갈림길', face: 1, say: [bs('갈림길이에요. 왼쪽은 날개 소리, 오른쪽은 물소리, 가운데는…… 아무 소리도 안 나요.'), mu('아무 소리도 안 나는 데가 제일 위험하오.')] },
  {
    t: 'visit',
    id: 'dc_fork',
    prompt: '가운데 길로 가기 전에 어디부터 볼까? (둘)',
    pick: 2,
    options: [
      { text: '왼쪽 굴', desc: '날개 소리가 난다', label: 'dc_left' },
      { text: '오른쪽 굴', desc: '물소리가 난다', label: 'dc_right' },
    ],
  },
  { t: 'goto', label: 'dc_center' },

  { t: 'label', name: 'dc_left' },
  { t: 'show', ids: ['dc_bat1', 'dc_bat2'] },
  { t: 'walk', to: '박쥐 방', face: 2 },
  { t: 'talk', lines: [n('천장에 박쥐 떼가 거꾸로 매달려 있었다. 횃불이 닿자 수백 개의 붉은 눈이 한꺼번에 떠졌다.'), bs('……나리, 조용히 뒤로—'), n('늦었다.')] },
  { t: 'battle', foe: 'dc_bats', hide: ['dc_bat1', 'dc_bat2'] },
  { t: 'talk', lines: [n('박쥐 똥 더미 아래 낡은 궤짝 하나가 있었다.'), mu('……열어 보시오. 박쥐가 지키던 거면 쓸 만한 거요.')] },
  { t: 'chest', id: 'dc_chest1' },
  { t: 'walk', to: '갈림길' },
  { t: 'ret' },

  { t: 'label', name: 'dc_right' },
  { t: 'show', ids: ['dc_wisp1'] },
  { t: 'walk', to: '샘', face: 3 },
  { t: 'talk', lines: [n('맑은 샘이 있었다. 샘가에 도깨비불 셋이 둥실 떠서 물을 마시고 있었다.'), mu('불이 물을 마시면 꺼지지 않소?'), bs('그러니까 귀신이죠. 저것들은 남의 물을 마시면 기운이 나요. 우리 거 마시러 오기 전에.')] },
  { t: 'battle', foe: 'dc_wisps', hide: ['dc_wisp1'] },
  { t: 'chest', id: 'dc_chest2' },
  { t: 'talk', lines: [mu('샘물이 차오. 얼굴 씻고 가시오, 임자. 그을음투성이요.'), n('무영이 젖은 손으로 내 뺨의 그을음을 문질렀다. 손이 생각보다 거칠고, 생각보다 조심스러웠다.')] },
  { t: 'walk', to: '갈림길' },
  { t: 'ret' },

  { t: 'label', name: 'dc_center' },
  { t: 'walk', to: '옛 사당 앞', face: 1, say: [n('가운데 굴은 길고 좁았다. 벽에 긁힌 자국이 이어졌다. 사람 손톱 자국 같았다.')] },
  { t: 'flag', set: 'shrine_seen' },
  {
    t: 'talk',
    lines: [
      n('굴 끝에 둥근 방이 있었다. 한가운데 솟대 하나가 서 있고, 벽에는 그림이 새겨져 있었다.', { scene: 'x-shrine' }),
      n('방망이를 든 사내가 해를 두른 용 문양 앞에 무릎을 꿇은 그림. 사내의 얼굴과 이름 자리는 누가 긁어 지운 듯 패여 있었다.'),
      bs('……이 방망이예요. 손잡이에 감긴 끈까지 똑같아요.'),
      mu('저 용 문양. 산채 늙은이들이 말하던 거요. 나라님 곳간 문에 붙는 문양.'),
      me('나라님 곳간 앞에서 빚쟁이가 무릎을 꿇었다. 이 사내는 빚을 받으러 간 거요, 갚으러 간 거요?'),
      n('방망이가 손안에서 떨었다. 벽화의 지워진 이름 자리에 먹빛 글씨가 떠오르려다 흩어졌다.'),
    ],
  },
  { t: 'cutscene', id: 'debt', broken: true, lines: ['이 굴의 주인이 남긴 빚 — (이름이 긁혀 나가 읽히지 않는다)'] },
  {
    t: 'talk',
    lines: [
      bs('나리, 이름 아래 글자가 비쳐요. "돌아오는 날, 갚는다."'),
      n('그때 솟대 꼭대기에서 푸른 불이 피어올랐다. 사당을 지키는 도깨비불이었다.', { scene: null }),
      mu('……사당지기요. 이 방에 들어온 놈이 빈손으로 나간 이유가 저거요.'),
    ],
  },
  { t: 'show', ids: ['dc_guard'] },
  { t: 'rest', train: 'dc_train' },
  tactic('tactic_dc', '사당지기 도깨비불이 박쥐 떼를 부른다. 작전은?', '깊은 굴 싸움'),
  { t: 'battle', foe: 'dc_guardian', hide: ['dc_guard'] },
  {
    t: 'talk',
    lines: [
      n('사당지기가 스러지자 솟대 아래 작은 함 하나가 드러났다. 함 안에는 낡은 염주 한 꾸러미와, 반쯤 탄 종이 한 장.'),
      n('종이에는 단 한 줄. "방망이를 이은 이에게. 빚은 받는 것보다 갚는 것이 어렵다."'),
      me('……전 주인이 남긴 말이오?'),
      bs('나리한테 남긴 말이에요. 방망이를 이은 사람이 나리니까.'),
      mu('갚을 빚이 있다는 거요. 임자가 아니라, 방망이한테.'),
    ],
  },
  {
    t: 'choice',
    id: 'shrine_cave',
    prompt: '전 주인의 함',
    options: [
      {
        text: '염주를 가져간다',
        desc: '전 주인이 쥐던 것',
        flag: 'shrine_beads',
        log: '옛 사당에서 전 주인의 염주를 가져왔다',
        reply: [n('염주를 쥐자 방망이의 울음이 멎었다. 알이 하나 모자랐다. 누가 하나를 빼 간 듯.'), bs('……하나는 어디 갔을까요. 이름처럼.')],
      },
      {
        text: '절하고 함은 두고 간다',
        desc: '돌아오는 날을 위해',
        bond: { baekseol: 4, muyeong: 4 },
        flag: 'shrine_bow',
        log: '옛 사당에 절하고 함은 그대로 두었다',
        reply: [n('나는 벽화 앞에 절을 했다. 무영이 따라 고개를 숙였고, 백설은 꼬리 아홉 개를 가지런히 모았다.'), mu('……돌아오는 날 갚는다 했으니, 그날까지 여기 둡시다.'), n('굴을 나서려는데, 백설이 함에서 염주 알 하나를 집어 내 손에 쥐여 주었다.'), bs('하나만요. 길 잃지 말라고.')],
      },
    ],
  },
  { t: 'give', item: 'prayerbeads', from: '전 주인의 염주' },
  { t: 'chest', id: 'dc_chest3' },
  { t: 'map', map: 'backhill', at: '늙은 소나무', dir: 0 },
  {
    t: 'talk',
    lines: [
      n('굴을 나오니 해가 높았다. 늙은 소나무 가지 사이로 볕이 쏟아졌다.'),
      bs('나리. 그 사람, 이름이 지워졌잖아요. 저처럼.'),
      me('찾으면 되오. 백설 이름 찾는 김에.'),
      bs('……그 말, 벌써 두 번째예요.'),
      mu('셋째는 내가 증인이오.'),
    ],
  },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'ret' },
];

// ───────────── 관아의 장부 ─────────────
const TOWN: Beat[] = [
  { t: 'label', name: 'ep_town' },
  { t: 'night', on: false },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'goal', text: '참봉의 첫 출근' },
  {
    t: 'talk',
    lines: [
      n('참봉 관복을 입고 처음으로 읍내 관아에 나가는 날. 달골에서 고개 하나 넘으면 읍내였다.'),
      sd('관아 장부는 송씨 댁 장부보다 두꺼워요. 오늘 다 못 봐요. 그래도 봐요.'),
      bs('관아엔 여우가 없나요? 있으면 인사해야죠.'),
      mu('……포졸들이 송씨 돈을 받는다는 소문이 있소. 내가 옆에 서겠소.'),
    ],
  },
  { t: 'map', map: 'town', at: '읍내 어귀', dir: 1 },
  { t: 'goal', text: '형방의 장부' },
  { t: 'walk', to: '장터 거리', face: 3, say: [n('읍내 장터 거리는 달골 장터의 세 배였다. 비단 장수, 옹기 장수, 엿장수.'), bs('나리, 저 엿 사 주세요. 참봉 첫 출근 기념이요.')] },
  { t: 'show', ids: ['rowdy1', 'rowdy2', 'rowdy3', 'town_widow'] },
  {
    t: 'talk',
    lines: [
      n('장터 끝에서 비명이 터졌다. 왈패 셋이 포목전 좌판을 엎고 있었다.'),
      npc('포목전 할멈', 'widow', '자릿세를 두 번이나 냈는데 또 내래요! 형방 나리가 시켰다고!'),
      npc('읍내 왈패', 'thug', '형방 나리 명이다. 비켜라, 촌뜨기 참봉.'),
      mu('……촌뜨기 참봉은 맞소. 비키는 건 못 하겠소.'),
    ],
  },
  { t: 'rest', train: 'town_train' },
  { t: 'battle', foe: 'town_rowdy', hide: ['rowdy1', 'rowdy2', 'rowdy3'] },
  {
    t: 'talk',
    lines: [
      npc('포목전 할멈', 'widow', '……참봉 나리라고? 달골 참봉이 읍내 왈패를 다 때려눕히다니.'),
      sd('할머니, 자릿세 영수증 있으세요? 두 번 낸 거요.'),
      npc('포목전 할멈', 'widow', '여기 있지. 형방 도장이 두 번 찍혔어.'),
      n('소담이 영수증을 받아 장부 사이에 끼웠다. 할멈은 비단 한 자락을 덤으로 쥐여 주었다.'),
    ],
  },
  { t: 'flag', set: 'town_receipt' },
  { t: 'coin', n: 40 },
  { t: 'hide', ids: ['town_widow'] },
  { t: 'walk', to: '관아 문 앞', face: 1 },
  { t: 'show', ids: ['pojol1', 'pojol2'] },
  {
    t: 'talk',
    lines: [
      npc('관아 포졸', 'soldier', '참봉 나리? 형방 어른께서 오늘은 들이지 말라 하셨소.'),
      me('참봉이 관아에 못 들어가면 어디로 출근하오.'),
      npc('관아 포졸', 'soldier', '……주막으로 하시든지.'),
      bs('나리, 주막 출근 좋은데요.'),
    ],
  },
  {
    t: 'nego',
    id: 'town_gate',
    who: '관아 포졸',
    face: 'soldier',
    prompt: '관아 문을 막아선 포졸들. 세 번 안에 말로 문을 열자. 못 열면 싸운다.',
    resolve: 100,
    turns: 3,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { charm: 1.0, coin: 1.4, threat: 0.8, ledger: 1.1 },
    clues: [
      { flag: 'town_receipt', label: '두 번 찍힌 형방 도장', power: 35, say: [sd('형방 도장이 두 번 찍힌 영수증이에요. 이거 들고 감찰이 오면 포졸 나리들도 같이 불려 가요.'), npc('관아 포졸', 'soldier', '……우, 우린 문만 지켰소.')] },
      { flag: 'q_bribe_won', label: '형방이 토해 낸 자릿세', power: 30, say: [me('지난번에 형방 나리가 자릿세를 토해 낸 일, 기억하시오?'), npc('관아 포졸', 'soldier', '……그때 그 참봉이었소?')] },
    ],
    react: [npc('관아 포졸', 'soldier', '명령이오. 못 들어가오.'), npc('관아 포졸', 'soldier', '……형방 어른이 화내실 텐데.'), npc('관아 포졸', 'soldier', '……들어가시오. 우린 못 본 거요.')],
    win: { flag: 'gate_open', log: '관아 문을 말로 열었다', lines: [n('포졸들이 슬그머니 창을 거두었다.')] },
    lose: { flag: 'gate_fight', log: '관아 문 앞에서 포졸들과 싸웠다', lines: [npc('관아 포졸', 'soldier', '말이 많소! 쳐라!')] },
  },
  { t: 'if', flag: 'gate_open', goto: 'town_in' },
  { t: 'battle', foe: 'pojol', hide: ['pojol1', 'pojol2'] },
  { t: 'label', name: 'town_in' },
  { t: 'hide', ids: ['pojol1', 'pojol2'] },
  { t: 'walk', to: '형방 앞', face: 1 },
  { t: 'show', ids: ['hyeongbang'] },
  {
    t: 'talk',
    lines: [
      npc('형방', 'ajeon', '허, 달골 참봉이 기어코 들어왔구먼. 참봉 자리는 송 대감 덕에 얻은 걸 잊었소?'),
      me('잊지 않았소. 그래서 송 대감 장부부터 보러 왔소.'),
      npc('형방', 'ajeon', '관아 서고는 형방 소관이오. 참봉은 손대지 마시오.'),
      sd('서고 열쇠는 형방 소관이지만, 장부 열람은 참봉 소관이에요. 관아 규칙 셋째 조예요.'),
      npc('형방', 'ajeon', '……계집이 관아 규칙은 어찌 아오.'),
      sd('송씨 댁 부엌에서 열 해 동안 관아 장부를 고쳤으니까요. 형방 나리가 시킨 것도 있었고요.'),
      n('형방의 얼굴이 하얘졌다.'),
    ],
  },
  {
    t: 'choice',
    id: 'hyeong',
    prompt: '서고 열쇠를 쥔 형방',
    options: [
      {
        text: '소담에게 맡긴다',
        desc: '장부는 장부로',
        bond: { sodam: 6 },
        flag: 'hyeong_sodam',
        log: '형방을 소담의 장부로 꺾었다',
        reply: [sd('작년 동짓달 스무날, 형방 나리가 송씨 댁에서 받은 엽전 삼백 냥. 제 글씨로 적었어요. 그 장부, 지금 제 품에 있어요.'), npc('형방', 'ajeon', '……열쇠, 여기 있소.'), n('소담은 열쇠를 받으며 한 번도 웃지 않았다. 대신 문을 나서며 내 소매를 꼭 쥐었다. 손이 떨리고 있었다.')],
      },
      {
        text: '방망이로 두드린다',
        desc: '빚은 빚으로',
        flag: 'hyeong_bat',
        log: '형방을 방망이로 두드려 열쇠를 받았다',
        reply: [n('방망이 끝이 형방의 어깨에 닿자 먹빛 글씨가 번졌다. "송씨에게 받은 뒷돈 — 엽전 삼백 냥."'), npc('형방', 'ajeon', '이, 이게 뭐요! 지워! 지우시오!'), me('갚으면 지워지오. 열쇠부터.'), npc('형방', 'ajeon', '……여기 있소.')],
      },
    ],
  },
  { t: 'hide', ids: ['hyeongbang'] },
  { t: 'walk', to: '동헌 앞', face: 1 },
  {
    t: 'talk',
    lines: [
      n('관아 서고는 동헌 뒤 곳간에 있었다. 먼지 쌓인 장부가 천장까지 쌓여 있었다. 소담이 사다리를 타고 올라갔다.'),
      sd('……찾았어요. 송씨 곡식 이관 장부예요.', { scene: 'x-town' }),
      sd('달골 창고에서 곡식 열두 칸이 "관아 보관"으로 옮겨졌다고 적혀 있어요. 그런데 관아 곳간엔 곡식이 한 톨도 없어요.'),
      mu('……열두 칸이 어디로 갔소.'),
      sd('내준 도장은 송씨 창고 관리인 것, 받은 도장은…… 비어 있어요.'),
      me('받은 사람이 없는 곡식이라. 그럼 아직 송씨 창고에 있거나, 어디로 빼돌렸겠군.'),
      bs('나리, 이제 남의 창고 문을 열 차례예요.'),
    ],
  },
  { t: 'flag', set: 'town_ledger' },
  { t: 'walk', to: '옥 앞', face: 1, say: [n('서고를 나서는데 옥 쪽에서 신음 소리가 났다.', { scene: null })] },
  { t: 'show', ids: ['prisoner'] },
  {
    t: 'talk',
    lines: [
      n('관아 옥에 뿔 달린 젊은이 하나가 갇혀 있었다.'),
      npc('옥에 갇힌 도깨비', 'bandit', '……떡 한 덩이 훔쳤소. 사흘째 물 한 모금 못 받았소.'),
      npc('옥에 갇힌 도깨비', 'bandit', '……선봉 누님? 그때 장터에서 떡값 내준 누님이오?', { if: 'q_goblin_mu' }),
      mu('……흑운채 아이요. 산채에서 쫓겨나 떠돌던.'),
    ],
  },
  {
    t: 'choice',
    id: 'prisoner',
    prompt: '옥에 갇힌 도깨비',
    options: [
      {
        text: '참봉 권한으로 풀어 준다',
        desc: '떡 한 덩이에 사흘이면 갚고도 남는다',
        bond: { muyeong: 6 },
        flag: 'prisoner_freed',
        log: '관아 옥에 갇힌 도깨비를 참봉 권한으로 풀어 주었다',
        reply: [me('떡 한 덩이에 옥살이 사흘이면, 관아가 이 아이한테 빚을 진 거요. 풀어 주시오.'), n('옥문이 열렸다. 젊은 도깨비가 무영 앞에 넙죽 엎드렸다.'), mu('……일어나라. 엎드리는 건 산채 버릇이다. 여기선 안 해도 된다.')],
      },
      {
        text: '떡값을 대신 갚고 풀게 한다',
        desc: '엽전 20냥. 법대로',
        coin: -20,
        bond: { muyeong: 4, sodam: 2 },
        flag: 'prisoner_paid',
        log: '옥에 갇힌 도깨비의 떡값을 대신 갚고 풀게 했다',
        reply: [sd('떡값 두 냥, 옥살이 이자 열여덟 냥. 합쳐서 스무 냥이요. 영수증 받을게요.'), n('젊은 도깨비는 옥을 나와 무영 뒤에 바짝 붙어 섰다.'), mu('……장부대로 풀려나는 것도 처음 보오.')],
      },
    ],
  },
  { t: 'hide', ids: ['prisoner'] },
  { t: 'walk', to: '읍내 어귀', face: 0 },
  {
    t: 'talk',
    lines: [
      n('읍내를 나서는데, 형방이 처마 밑에서 누군가에게 서찰을 건네고 있었다. 송씨 댁 하인이었다.'),
      sd('형방이 송씨 댁에 알리는 거예요. 우리가 이관 장부를 봤다고.'),
      mu('……창고 쪽이 바빠지겠소.'),
      n('그때 파발 하나가 우리를 앞질러 달려갔다. 도성에서 왕실 조사관이 내려온다는 소식이었다.'),
      bs('어머. 바빠지는 건 창고만이 아니겠네요.'),
    ],
  },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'ret' },
];

// ───────────── 산채의 겨울 ─────────────
const CAMP: Beat[] = [
  { t: 'label', name: 'ep_camp' },
  { t: 'night', on: false },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'goal', text: '산채의 겨울 준비' },
  {
    t: 'talk',
    lines: [
      n('먹쇠와 문서를 봉인한 지 열흘. 흑운채에서 기별이 왔다. 겨울 준비를 거들어 달라고.'),
      mu('……어머니 대장간에 불을 넣어야 하오. 다섯 해 동안 식어 있었소.'),
      sd('겨울 양식 장부는 제가 볼게요. 산채 아이들 몫부터요.'),
      bs('저는 아이들이랑 놀게요. 여우는 아이들이 좋아해요. 무서워하거든요.'),
    ],
  },
  { t: 'map', map: 'camp', at: '목책 문', dir: 1 },
  { t: 'show', ids: ['c_meok', 'c_cheol', 'c_kid1', 'c_kid2'] },
  { t: 'walk', to: '산채 마당', face: 1, say: [n('목책 안은 생각보다 넓었다. 움막마다 연기가 오르고, 뿔 달린 아이들이 우리를 보고 숨었다.')] },
  {
    t: 'talk',
    lines: [
      npc('먹쇠', 'meoksoe', '왔구려, 참봉. 그리고 무영이. 네 어미 대장간, 아무도 손 안 댔다.'),
      npc('철곰', 'cheolgom', '……목책 앞에서 진 거, 아직 안 잊었다.'),
      mu('나도 안 잊었소. 다음엔 쇠방망이 들고 붙읍시다.'),
      npc('철곰', 'cheolgom', '흥. ……환영한다.'),
    ],
  },
  {
    t: 'visit',
    id: 'camp_help',
    prompt: '해 지기 전에 산채 일을 거들자 (둘)',
    pick: 2,
    options: [
      { text: '대장간에 불 넣기', desc: '무영 어머니의 화덕', label: 'cp_forge' },
      { text: '겨울 양식 장부', desc: '소담과 먹쇠의 곳간', label: 'cp_food' },
      { text: '아이들 움막', desc: '백설과 뿔 달린 아이들', label: 'cp_kids' },
    ],
  },
  { t: 'goto', label: 'cp_dusk' },

  { t: 'label', name: 'cp_forge' },
  { t: 'walk', to: '대장간', face: 1 },
  {
    t: 'talk',
    lines: [
      n('대장간 화덕에 다섯 해 만에 불이 들어갔다. 무영이 모루 앞에 섰다.', { scene: 'x-forge' }),
      mu('……어머니는 여기서 하루에 쇠를 천 번 두드렸소. 나는 백 번 만에 팔이 빠졌고.'),
      n('무영이 쇠망치를 내리쳤다. 쇠가 울었다. 한 번, 두 번. 백 번을 넘기고도 그녀는 멈추지 않았다.'),
      mu('임자. 풀무 좀 밟아 주시오. ……어머니 자리에 누가 서 있는 거, 처음이오.'),
    ],
  },
  {
    t: 'choice',
    id: 'cp_forge',
    prompt: '다섯 해 만의 대장간',
    options: [
      { text: '풀무를 밟는다', desc: '불이 꺼지지 않게', bond: { muyeong: 6 }, flag: 'forge_bellows', log: '산채 대장간에서 무영의 풀무를 밟았다', reply: [n('풀무를 밟을 때마다 불길이 솟았다. 무영의 망치가 박자를 맞췄다. 해 질 녘, 그녀가 식힌 쇠고리 하나를 내 방망이 손잡이에 끼웠다.'), mu('……어머니 망치로 처음 벼린 거요. 임자 방망이에 걸어 두시오.')] },
      { text: '망치를 받아 든다', desc: '무영이 숨 돌리게', bond: { muyeong: 4 }, flag: 'forge_hammer', log: '산채 대장간에서 무영 대신 망치를 들었다', reply: [n('내 망치질은 형편없었다. 쇠가 비뚤어질 때마다 무영이 웃음을 참느라 어깨를 떨었다.'), mu('……장작 패듯 하지 말라니까. 이리 주시오.'), n('결국 쇠고리는 무영이 마저 벼렸다. 그녀는 그것을 내 손에 쥐여 주며 처음으로 소리 내어 웃었다.')] },
    ],
  },
  { t: 'give', item: 'forgering', from: '무영이 벼린 쇠고리' },
  { t: 'walk', to: '산채 마당' },
  { t: 'ret' },

  { t: 'label', name: 'cp_food' },
  { t: 'walk', to: '큰 마루 앞', face: 1 },
  {
    t: 'talk',
    lines: [
      n('큰 마루 아래 곳간. 소담이 먹쇠와 나란히 앉아 곡식 자루를 하나하나 세었다.'),
      sd('……모자라요. 지금 양식으로는 동짓달까지예요. 그다음 석 달은 비어요.'),
      npc('먹쇠', 'meoksoe', '해마다 그랬소. 그래서 송씨 곡식을 빌렸고.'),
      sd('송씨한테 돌려받을 곡식이 있어요. 심리가 끝나면요. 그걸 어디에 먼저 쓸지 정해야 해요.'),
    ],
  },
  {
    t: 'choice',
    id: 'cp_food',
    prompt: '돌려받을 곡식, 어디에 먼저?',
    options: [
      { text: '산채에 먼저', desc: '동짓달 뒤 석 달이 비었다', bond: { muyeong: 3, sodam: 3 }, flag: 'food_camp_first', log: '돌려받을 곡식을 산채 겨울에 먼저 쓰기로 했다', reply: [npc('먹쇠', 'meoksoe', '……사람 마을 곡식을 도깨비 산채에 먼저라. 참봉, 그 셈은 누가 가르쳐 줬소.'), sd('제가요. 굶는 집부터 채우는 게 장부의 첫 줄이에요.')] },
      { text: '마을과 반씩', desc: '두 곳 다 겨울을 넘긴다', bond: { sodam: 6 }, flag: 'food_split', log: '돌려받을 곡식을 마을과 산채가 반씩 나누기로 했다', reply: [sd('반씩이면 둘 다 빠듯해요. 그래도 둘 다 넘겨요. 제가 날마다 셀게요.'), npc('먹쇠', 'meoksoe', '……빠듯한 겨울은 견딜 만하오. 빈 겨울이 무섭지.')] },
    ],
  },
  { t: 'walk', to: '산채 마당' },
  { t: 'ret' },

  { t: 'label', name: 'cp_kids' },
  { t: 'walk', to: '아이들 움막', face: 3 },
  {
    t: 'talk',
    lines: [
      n('아이들은 처음엔 백설의 꼬리를 무서워했다. 반 시진 뒤에는 꼬리 아홉 개에 하나씩 매달려 있었다.'),
      bs('어머, 어머. 거긴 잡으면 안 돼요. 거긴…… 아, 괜찮아요. 거기는 괜찮아요.'),
      npc('산채 아이', 'bandit', '누나. 누나 이름 뭐예요?'),
      bs('백설이요.'),
      npc('산채 아이', 'bandit', '그거 진짜 이름이에요? 우리 엄마가, 여우는 진짜 이름을 안 알려 준대요.'),
      n('백설의 웃음이 잠깐 멈췄다.'),
    ],
  },
  {
    t: 'choice',
    id: 'cp_kids',
    prompt: '진짜 이름이냐는 아이',
    options: [
      { text: '"그래, 진짜 이름이다"', desc: '내가 대신 대답한다', bond: { baekseol: 6 }, flag: 'kids_realname', log: '산채 아이에게 백설이 진짜 이름이라고 대신 대답했다', reply: [me('그래. 백설이 진짜 이름이다. 내가 날마다 부르는 이름이니까.'), n('백설이 나를 보았다. 아이들이 와 하고 그녀의 꼬리에 다시 매달렸다.'), bs('……나리, 그런 대답은 반칙이에요.')] },
      { text: '백설에게 맡긴다', desc: '그녀의 대답을 기다린다', bond: { baekseol: 4 }, flag: 'kids_bs_answer', log: '산채 아이의 물음에 백설이 직접 대답하게 했다', reply: [bs('……진짜 이름은 맡겨 뒀어요. 대신 이 이름은 제가 지었어요. 그러니까 이것도 진짜예요.'), npc('산채 아이', 'bandit', '맡겨 뒀어요? 그럼 찾아와야겠네요!'), bs('……응. 찾아올 거야.')] },
    ],
  },
  { t: 'walk', to: '산채 마당' },
  { t: 'ret' },

  { t: 'label', name: 'cp_dusk' },
  { t: 'night', on: true },
  { t: 'goal', text: '검은바람' },
  {
    t: 'talk',
    lines: [
      n('해가 지자 망루에서 북이 울렸다.'),
      npc('철곰', 'cheolgom', '검은바람이다! 독사 놈 뒤를 봐주던 놈들이 산채 곳간의 송씨 상자를 노린다!'),
      npc('먹쇠', 'meoksoe', '그 상자는 심리에 쓸 증거다. 내주면 산채는 다시 송씨 빚쟁이가 된다.'),
      mu('……목책 문은 내가 맡겠소.'),
      npc('철곰', 'cheolgom', '혼자는 안 된다. 나도 선다. ……이번엔 같은 편이다.'),
    ],
  },
  { t: 'hide', ids: ['c_kid1', 'c_kid2'] },
  { t: 'walk', to: [12, 17], face: 0 },
  { t: 'show', ids: ['raid1', 'raid2', 'raid3', 'raid_boss'] },
  {
    t: 'talk',
    lines: [
      npc('검은바람 우두머리', 'bandit', '산채 늙은이들, 상자만 내놔라. 그럼 겨울은 살게 해 주지.'),
      mu('……그 말, 송씨한테서 귀에 못이 박히게 들었소.'),
      bs('나리, 아이들은 소담 씨가 움막 깊이 숨겼어요.'),
      sd('……장부도 같이 숨겼어요. 제일 깊은 데.'),
    ],
  },
  { t: 'rest', train: 'raid_train' },
  tactic('tactic_camp', '검은바람 우두머리가 횃불을 든 졸개들을 앞세웠다. 작전은?', '산채 싸움'),
  { t: 'battle', foe: 'raiders', hide: ['raid1', 'raid2', 'raid3', 'raid_boss'] },
  {
    t: 'talk',
    lines: [
      n('검은바람 우두머리가 목책 밖으로 굴러 나갔다. 철곰이 그 뒤에 대고 쇠망치를 땅에 내리쳤다. 산이 울렸다.'),
      npc('철곰', 'cheolgom', '……이 산채엔 이제 두목이 둘이다. 먹쇠 영감, 그리고 저 방망이 든 놈.'),
      npc('먹쇠', 'meoksoe', '참봉. 이 상자, 심리 날까지 산채가 지키겠소. 목숨을 걸고.'),
      mu('……어머니 대장간 불, 오늘 밤엔 안 꺼지겠소.'),
    ],
  },
  { t: 'flag', set: 'camp_saved' },
  { t: 'night', on: false },
  {
    t: 'talk',
    lines: [
      n('이튿날 아침, 산채 아이들이 목책 문까지 따라 나와 배웅했다.'),
      bs('……아이들이 저보고 백설 누나래요. 누나요.', { if: 'kids_realname' }),
      bs('……아이들이 제 이름 찾으면 꼭 알려 달래요. 약속했어요.', { if: 'kids_bs_answer' }),
      mu('……가끔 와도 되겠소? 여기.'),
      me('무영 집이잖소. 오는 게 아니라 들르는 거지.'),
      n('무영이 고개를 돌렸다. 뿔 끝이 아침 해보다 붉었다.'),
    ],
  },
  { t: 'hide', ids: ['c_meok', 'c_cheol'] },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'ret' },
];

// ───────────── 송 대감 댁 잠입 ─────────────
const MANOR: Beat[] = [
  { t: 'label', name: 'ep_manor' },
  { t: 'night', on: true },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'goal', text: '뜯긴 승인란' },
  {
    t: 'talk',
    lines: [
      n('공개 심리를 이틀 앞둔 밤. 별창 장부에서 뜯겨 나간 승인란이 마음에 걸렸다.'),
      sd('……그 장부, 송씨 댁에선 강 집사 방 궤짝에 넣어요. 열 해 동안 그랬어요. 뜯은 것도 거기 있을 거예요.'),
      mu('송 대감 댁에 숨어 들어가자는 거요?'),
      sd('숨어 들어가는 게 아니라, 제가 열 해 동안 드나든 집에 다시 가는 거예요.'),
      bs('여우는 밤길이 특기예요. 제가 앞장설게요.'),
      n('뒷문은 송채령이 열어 두겠다고 했다. 서찰은 짧았다. "자정, 뒷문. 아무것도 훔치지 마세요. 돌려받을 것만 가져가세요."'),
    ],
  },
  { t: 'map', map: 'manor', at: '뒷문', dir: 2 },
  { t: 'show', ids: ['m_chae'] },
  {
    t: 'talk',
    lines: [
      npc('송채령', 'chaeryeong', '……정말 오셨군요. 강 집사 방은 사랑채 옆입니다. 순라가 두 패. 저는 못 본 걸로 하겠습니다.'),
      bs('아가씨, 왜 도와주세요?'),
      npc('송채령', 'chaeryeong', '아버지 이름이 남의 손에 쓰이는 걸, 더는 못 보겠어서요.'),
    ],
  },
  { t: 'hide', ids: ['m_chae'] },
  { t: 'walk', to: '안채 뒤', face: 2, say: [sd('이쪽이요. 연못가로 돌면 순라를 피할 수 있어요. 행랑 마당은 빠르지만 순라가 있어요.')] },
  {
    t: 'choice',
    id: 'route',
    prompt: '어느 길로 갈까',
    options: [
      { text: '연못가로 돌아간다', desc: '소담이 아는 길. 느리지만 조용하다', bond: { sodam: 3, baekseol: 2 }, flag: 'route_pond', log: '송 대감 댁 연못가 길로 숨어 들어갔다' },
      { text: '행랑 마당을 가로지른다', desc: '빠르지만 순라와 마주친다', bond: { muyeong: 3 }, flag: 'route_yard', log: '송 대감 댁 행랑 마당을 가로질렀다' },
    ],
  },
  { t: 'if', flag: 'route_pond', goto: 'mn_pond' },
  { t: 'walk', to: '행랑 마당', face: 2 },
  { t: 'show', ids: ['mguard1', 'mguard2'] },
  { t: 'talk', lines: [npc('송씨 사병', 'soldier', '거기 누구냐!'), mu('……빠른 길은 시끄러운 길이오.')] },
  { t: 'rest', train: 'manor_train' },
  { t: 'battle', foe: 'mguards', hide: ['mguard1', 'mguard2'] },
  { t: 'goto', label: 'mn_room' },
  { t: 'label', name: 'mn_pond' },
  { t: 'walk', to: '연못가', face: 2, say: [n('연못가 갈대 그늘. 순라 횃불이 바로 옆을 지나갔다.')] },
  { t: 'talk', lines: [n('백설이 꼬리로 우리 넷을 감쌌다. 횃불빛이 은빛 꼬리 위로 미끄러졌다.'), bs('……숨 참으세요. 여우 꼬리는 달빛에선 갈대처럼 보여요.'), n('순라가 지나갔다. 백설의 꼬리 속은 따뜻했고, 소담의 숨이 내 목덜미에 닿았다.')] },
  { t: 'label', name: 'mn_room' },
  { t: 'walk', to: '소담의 옛 방', face: 1 },
  {
    t: 'talk',
    lines: [
      n('행랑 끝 좁은 방. 소담이 문을 열고 들어가 무릎을 꿇었다.', { scene: 'x-manor' }),
      sd('……여기가 제 방이었어요. 열 해 동안.'),
      n('나무 기둥에 칼자국이 줄지어 있었다. 아이 키 높이에서 시작해, 조금씩 올라가는.'),
      sd('해마다 키를 쟀어요. 아무도 안 재 줘서, 제가 쟀어요.'),
      sd('열 번째 자국 위로는 없어요. 그해부터는…… 잴 이유가 없어서 안 쟀어요.'),
    ],
  },
  {
    t: 'choice',
    id: 'sd_room',
    prompt: '기둥의 칼자국',
    options: [
      { text: '새 자국을 하나 새겨 준다', desc: '오늘의 키를 잰다', bond: { sodam: 8 }, flag: 'sd_mark', log: '소담의 옛 방 기둥에 오늘의 키를 새겨 주었다', reply: [n('소담을 기둥 앞에 세우고, 정수리 높이에 칼끝으로 금을 그었다. 열 번째 자국보다 한 뼘 위였다.'), sd('……컸네요. 저.'), sd('이번엔 누가 재 줬어요. 처음으로.'), n('그녀는 울지 않았다. 대신 새 자국을 손끝으로 오래 쓸었다.')] },
      { text: '이 방은 두고 가자', desc: '돌아올 곳은 여기가 아니다', bond: { sodam: 5 }, flag: 'sd_leave_room', log: '소담의 옛 방을 두고 나왔다', reply: [sd('……네. 이제 제 방은 오두막 부엌이에요.'), n('소담이 방문을 닫았다. 조용히, 단단하게.')] },
    ],
  },
  { t: 'walk', to: '곳간 앞', face: 0, say: [n('강 집사 방으로 가는 길, 곳간 문이 반쯤 열려 있었다.', { scene: null })] },
  { t: 'chest', id: 'manor_chest' },
  { t: 'walk', to: '사랑채 앞', face: 1 },
  { t: 'show', ids: ['mguard3', 'butler'] },
  {
    t: 'talk',
    lines: [
      n('사랑채 옆 강 집사 방 앞. 횃불을 든 사병 하나, 그리고 강 집사가 서 있었다. 늙은 매 같은 눈이었다.'),
      npc('강 집사', 'keeper', '……소담이로구나. 부엌데기가 도둑이 되어 돌아왔어.'),
      sd('도둑질은 집사 어른이 했죠. 대감 이름으로.'),
      npc('강 집사', 'keeper', '대감께선 아무것도 모르신다. 몇 달째 사랑채에서 숨만 쉬고 계시지. 그러니 대감 이름은 내가 대신 써 드리는 거다.'),
      mu('……그게 도둑질이오.'),
    ],
  },
  {
    t: 'nego',
    id: 'butler',
    who: '강 집사',
    face: 'keeper',
    prompt: '뜯긴 승인란을 쥔 강 집사. 네 번 안에 내놓게 하자. 못 하면 사병을 부른다.',
    resolve: 115,
    turns: 4,
    tools: ['bat', 'charm', 'threat', 'ledger', 'coin'],
    mods: { ledger: 1.4, bat: 1.3, threat: 0.8, charm: 0.7, coin: 0 },
    clues: [
      { flag: 'butler_named', label: '사병 우두머리가 댄 이름', power: 35, say: [me('별창 사병 우두머리가 그러더군. 명은 늘 강 집사가 전했다고.'), npc('강 집사', 'keeper', '……입이 싼 놈.')] },
      { flag: 'town_ledger', label: '관아 곡식 이관 장부', power: 30, say: [sd('관아 이관 장부에 받은 도장이 비어 있었어요. 받은 사람이 없는 곡식은 집사 어른 손을 거쳤죠.')] },
      { flag: 'steward_talked', label: '창고 관리인의 밤배 진술', power: 25, say: [me('창고 관리인이 밤배 이야기를 다 했소. 열쇠를 가져간 게 누군지도.')] },
      { flag: 'sd_mark', label: '소담의 열 해', power: 25, say: [sd('저 열 해 동안 이 집 장부를 고쳤어요. 집사 어른이 시킨 칸은 글씨체가 달라요. 제 글씨니까요.'), n('강 집사의 손이 떨렸다.')] },
    ],
    react: [npc('강 집사', 'keeper', '내놓을 건 없다.'), npc('강 집사', 'keeper', '……그 장부를 어디서.'), npc('강 집사', 'keeper', '…….')],
    win: {
      flag: 'butler_gave',
      log: '강 집사에게서 뜯긴 승인란을 받아 냈다',
      lines: [n('강 집사가 품에서 접힌 종이를 꺼내 던졌다.'), npc('강 집사', 'keeper', '가져가라. 어차피 거기 찍힌 도장은 너희가 못 건드린다.')],
    },
    lose: { flag: 'butler_fight', log: '강 집사가 사병을 불렀다', lines: [npc('강 집사', 'keeper', '사병들! 도둑이다!')] },
  },
  { t: 'if', flag: 'butler_gave', goto: 'mn_page' },
  { t: 'battle', foe: 'mguards2', hide: ['mguard3'] },
  { t: 'talk', lines: [n('사병들이 쓰러진 틈에 강 집사는 담을 넘어 사라졌다. 그가 떨어뜨린 종이 한 장이 마당에 남았다.')] },
  { t: 'label', name: 'mn_page' },
  { t: 'hide', ids: ['butler', 'mguard3'] },
  { t: 'flag', set: 'approval_page' },
  {
    t: 'talk',
    lines: [
      n('뜯긴 승인란. 거기 찍힌 도장은 송씨 인장이 아니었다. 해를 두른 용. 방망이 손잡이와 같은 문양이었다.'),
      bs('……뒷산 굴 벽화의 그 문양이에요.', { if: 'shrine_seen' }),
      sd('이건 송씨가 아니라…… 더 위에서 승인한 거예요.'),
      mu('송 대감을 부를 수 없다던 까닭이 이거였소.'),
      me('심리에선 이걸로 이자까지 받아 내겠소. 용은…… 나중에 받으러 가지.'),
    ],
  },
  { t: 'show', ids: ['m_song'] },
  {
    t: 'talk',
    lines: [
      n('돌아서는데, 사랑채 툇마루에 누군가 앉아 있었다. 송 대감이었다.'),
      n('그는 우리를 보고 있었다. 아무 말도, 아무 손짓도 하지 않았다. 사병을 부르지도 않았다. 그저 지친 눈으로 우리를 지나 보냈다.'),
      bs('(작게) ……나리, 저 사람. 처음으로 웃지 않아요.'),
    ],
  },
  { t: 'hide', ids: ['m_song'] },
  { t: 'walk', to: '뒷문', face: 3 },
  { t: 'map', map: 'village', at: '오두막', dir: 0 },
  { t: 'night', on: false },
  { t: 'ret' },
];

export const EXTRA_BEATS: Beat[] = [...CAVE, ...TOWN, ...CAMP, ...MANOR];
