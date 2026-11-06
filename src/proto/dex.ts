// 도감(2026-11-06, 1부 완성형 볼륨 2단계): 만난 사람과 싸운 적. 이름(keys) 가운데 하나라도 Game.seen에 있으면 열린다.
// 그림은 SD(public/proto/sd/<sd>.webp)가 있으면 그것, 없으면 32×32 도트(char).
import type { CharName } from './atlas32';
import type { MemberId } from './types';

export interface DexEntry {
  id: string;
  name: string;
  kind: '식객' | '사람' | '적';
  keys: string[];
  /** 식객은 합류하면 열린다 */
  member?: MemberId;
  sd?: string;
  char?: CharName;
  desc: string;
}

export const DEX: DexEntry[] = [
  { id: 'baekseol', name: '백설', kind: '식객', keys: [], member: 'baekseol', sd: 'baekseol', desc: '구미호. 나른한 존댓말로 "나리"를 부른다. 진짜 이름을 송씨 계약에 저당 잡혔고, 그 이름을 쥔 사람이 부르면 거절하지 못한다. 접이 거울로 남의 얼굴을 읽는다.' },
  { id: 'muyeong', name: '무영', kind: '식객', keys: [], member: 'muyeong', sd: 'muyeong', desc: '흑운채의 전 선봉. 어머니가 벼린 쇠방망이를 한 손으로 휘두른다. 말수가 적고 "임자"라고 부른다. 산채 아이들의 겨울을 위해 송씨 상자를 눈감아 준 일을 짊어지고 있다.' },
  { id: 'sodam', name: '소담', kind: '식객', keys: ['항아리 속 여자'], member: 'sodam', sd: 'sodam', desc: '우렁각시. 열 해 동안 송씨 댁 부엌에서 숨어 지내며 장부를 고쳤다. 저울과 장부 앞에서는 한 치도 물러서지 않는다. 장부에 안 적는 것이 하나 있다.' },

  { id: 'widow', name: '과부댁', kind: '사람', keys: ['과부댁', '약초꾼 할멈'], sd: 'widow', desc: '달골의 입. 씨암탉을 잃어버리는 게 특기다. 마을 소문은 과부댁 귀에 제일 먼저 들어가고, 제일 늦게 나온다.' },
  { id: 'innkeeper', name: '주막 영감', kind: '사람', keys: ['주막 영감', '마을 어른', '씨름판 영감', '장터 객주'], sd: 'innkeeper', desc: '외상 장부를 쥐고 마을을 지켜보는 늙은 주막 주인. 외상은 절대 지워 주지 않지만, 엽전은 슬쩍 쥐여 준다.' },
  { id: 'keeper', name: '창고 관리인', kind: '사람', keys: ['창고지기', '창고 관리인', '송씨 댁 청지기'], sd: 'keeper', desc: '송씨 댁 창고지기. 노름빚에 쫓겨 1화 뒷산에서 나를 묻으려 했다. 그 뒤로 빚이 꼬일 때마다 나와 마주친다.' },
  { id: 'villagers', name: '마을 아낙들', kind: '사람', keys: ['떡장수 아낙', '마을 아낙', '우물가 아낙'], sd: 'villager', desc: '새벽 우물가와 장터의 눈과 귀. 누구 집 부엌에서 물 붓는 소리가 나는지까지 다 안다.' },
  { id: 'fishmonger', name: '생선 장수', kind: '사람', keys: ['생선 장수', '일꾼', '돌쇠', '짚신 장수'], sd: 'fishmonger', desc: '송씨 댁에서 빌린 저울로 열 해를 장사한 사내. 한 근이 한 근인 줄 알게 된 뒤로 정직이 가장 비싼 물건이 되었다.' },
  { id: 'inbu', name: '나루 인부', kind: '사람', keys: ['나루 인부', '나루 사공', '소금 배 상인'], sd: 'fishmonger', desc: '강나루에서 짐을 나르는 사람들. 밤배에 무엇이 실렸는지 가장 먼저 보고, 가장 늦게 말한다.' },
  { id: 'ajeon', name: '관아 아전', kind: '사람', keys: ['관아 아전', '관아 형방'], sd: 'ajeon', desc: '관아의 붓. 도장을 찍는 손이 누구의 돈을 받느냐에 따라 달골의 장부가 바뀐다.' },
  { id: 'chaeryeong', name: '송채령', kind: '사람', keys: ['송채령', '송씨 측 대리인'], sd: 'chaeryeong', desc: '송 대감의 딸. 차갑고 우아하다. 가문을 물려받으려면 어디가 썩었는지부터 알아야 한다며, 자정에 홀로 별창 열쇠를 들고 왔다.' },
  { id: 'yunseo', name: '윤서경', kind: '사람', keys: ['윤서경'], sd: 'yunseo', desc: '왕실 조사관. 증거와 추측을 칼같이 나눈다. 도끼질은 심사하지 않는다.' },
  { id: 'namjihu', name: '남지후', kind: '사람', keys: ['남지후'], sd: 'namjihu', desc: '선박 상단의 젊은 후계자. 장사꾼이라 정의는 덤이라고 말하지만, 송채령 앞에서는 셈이 자꾸 틀린다.' },
  { id: 'meoksoe', name: '먹쇠', kind: '사람', keys: ['먹쇠'], sd: 'meoksoe', desc: '흑운채의 늙은 두목. 산채 사람들이 겨울을 나게 하려고 송씨 곡식을 빌렸다. 바라는 것은 정착할 땅 하나.' },
  { id: 'songdaegam', name: '송 대감', kind: '사람', keys: ['송 대감'], sd: 'songdaegam', desc: '달골의 큰손. 빚 대신 사람을 산다. 몇 달째 사랑채 밖으로 나오지 않는다는데, 그 앞에 서면 방망이가 늘 웅웅 운다.' },

  { id: 'racoon', name: '뒷산 너구리', kind: '적', keys: ['뒷산 너구리', '장독 깨는 너구리', '창고 너구리 떼'], char: 'racoon', desc: '장독과 곡식 자루를 노리는 살진 너구리. 된장 냄새를 풍기며 나타난다.' },
  { id: 'wisp', name: '도깨비불', kind: '적', keys: ['도깨비불'], char: 'wisp', desc: '밤마다 떠다니는 푸른 불. 등잔 기름을 핥아먹는다. 귀엽지만 얄밉다.' },
  { id: 'bat', name: '굴 박쥐', kind: '적', keys: ['굴 박쥐'], char: 'bat', desc: '흑운채 산적굴의 박쥐 떼. 어둠 속에서 붉은 눈만 보인다.' },
  { id: 'thug', name: '송씨 머슴', kind: '적', keys: ['송씨 머슴', '몽둥이 장정', '파락호', '머슴 대장', '송씨 일꾼', '나루 왈패'], char: 'thug', desc: '송씨 댁의 주먹. 노름판과 행패가 일이다. 대장은 몽둥이 대신 대감 이름을 휘두른다.' },
  { id: 'bandit', name: '흑운채 졸개', kind: '적', keys: ['흑운채 졸개', '흑운채 보초', '젊은 도깨비'], char: 'bandit', desc: '고갯길의 도깨비 산적. 통행세를 걷지만 한 푼도 손에 안 남는다. 알고 보면 겨울을 걱정하는 이웃.' },
  { id: 'mokso', name: '흑운채 두목', kind: '적', keys: ['흑운채 두목'], char: 'mokso', desc: '고갯길을 맡던 두목. 통행세를 혼자 챙기다 산채에서 쫓겨났다.' },
  { id: 'pickpocket', name: '소매치기', kind: '적', keys: ['소매치기'], char: 'pickpocket', desc: '장날의 그림자. 패랭이를 비뚜름히 쓰고 다닌다.' },
  { id: 'doksa', name: '독사', kind: '적', keys: ['독사', '독사의 잔당'], char: 'doksa', desc: '밀수 상단 행수. 목에 뱀 문신을 새겼다. 이름만 독사라는 말도 있다.' },
  { id: 'cheolgom', name: '철곰', kind: '적', keys: ['철곰'], char: 'cheolgom', desc: '흑운채 선봉장. 쇠비늘 갑옷과 거대한 쇠망치. 부수면 고치라 하고, 고치면 밥을 주는 마을에 아직 적응 중이다.' },
  { id: 'soldier', name: '송씨 사병', kind: '적', keys: ['송씨 사병', '사병 우두머리'], char: 'soldier', desc: '복면을 쓴 송씨 댁 사병. 명은 늘 강 집사가 전한다.' },
  { id: 'bribed', name: '매수된 아전', kind: '적', keys: ['매수된 아전', '아전 우두머리'], char: 'ajeon', desc: '송씨 돈으로 산 도장들. 장부에 이름이 다 있다.' },
  { id: 'assassin', name: '자객', kind: '적', keys: ['자객', '자객 우두머리'], char: 'assassin', desc: '무늬 없는 단검을 쓰는 복면 자객. 아무 문양도 없어서 더 송씨답다.' },
];
