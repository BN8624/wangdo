import type { Episode } from '../core/types';
import { sortEpisodes } from '../core/story';

// content/story/<부>/<화>.json을 모두 읽는다. 새 화 파일을 넣기만 하면 게임에 붙는다.
const files = import.meta.glob<Episode>('../../content/story/*/*.json', { eager: true, import: 'default' });

export const EPISODES: Episode[] = sortEpisodes(Object.values(files));
export const EPISODE_BY_ID: Record<string, Episode> = Object.fromEntries(EPISODES.map((e) => [e.id, e]));
