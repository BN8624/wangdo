// 식객 인연 대사. 글은 content/bonds/<id>.json에 있다(Codex가 쓰고 사람이 다듬는다).
export interface BondTalk {
  line: string;
  replies: { text: string; delta: number; reaction: string }[];
}

export interface SceneLine {
  who: 'narration' | 'me' | 'her';
  text: string;
}

export interface BondScene {
  level: number;
  title: string;
  lines: SceneLine[];
}

export interface BondContent {
  id: string;
  talks: BondTalk[];
  gift: { liked: string; normal: string };
  outing: string[];
  scenes: BondScene[];
}

const files = import.meta.glob<BondContent>('../../content/bonds/*.json', { eager: true, import: 'default' });

export const BOND_CONTENT: Record<string, BondContent> = Object.fromEntries(
  Object.values(files).map((c) => [c.id, c]),
);

const FALLBACK: BondContent = {
  id: '',
  talks: [
    {
      line: '오늘 하루는 어땠어요?',
      replies: [
        { text: '덕분에 즐거웠어', delta: 8, reaction: '헤헤, 저도요!' },
        { text: '그럭저럭', delta: 4, reaction: '내일은 더 좋을 거예요.' },
        { text: '피곤하네', delta: 1, reaction: '푹 쉬어요.' },
      ],
    },
  ],
  gift: { liked: '이걸 어떻게 알았어요? 정말 좋아요!', normal: '고마워요, 잘 쓸게요.' },
  outing: ['오늘 나들이, 정말 즐거웠어요.'],
  scenes: [],
};

export const bondContent = (id: string): BondContent => BOND_CONTENT[id] ?? { ...FALLBACK, id };
