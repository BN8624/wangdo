import { sortEpisodes } from '../core/story';
import type { Episode } from '../core/types';
import { EPISODE_FILES } from './story-index';

// 이야기 화 목록. content/story에 파일을 넣으면 story-index.ts가 자동으로 다시 만들어진다.
export const EPISODES: Episode[] = sortEpisodes(EPISODE_FILES);
export const EPISODE_BY_ID: Record<string, Episode> = Object.fromEntries(EPISODES.map((e) => [e.id, e]));
