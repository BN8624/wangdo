import { ART } from '../data/art';
import type { ResourceKey } from '../core/types';
import { Art } from './Portrait';
export type IconKind = ResourceKey | 'stamina';
export function IconSymbols() {
    return <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}><defs>
    <symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f2c66d"/><rect x="9" y="9" width="6" height="6" fill="#3a2a10"/></symbol>
    <symbol id="i-rice" viewBox="0 0 24 24"><path d="M12 21V9" stroke="#b9d77a" strokeWidth="2"/><g fill="#f0d37a"><ellipse cx="12" cy="6" rx="2.4" ry="3.6"/><ellipse cx="8" cy="10" rx="2.2" ry="3.2" transform="rotate(-30 8 10)"/><ellipse cx="16" cy="10" rx="2.2" ry="3.2" transform="rotate(30 16 10)"/><ellipse cx="8.4" cy="15" rx="2" ry="3" transform="rotate(-35 8.4 15)"/><ellipse cx="15.6" cy="15" rx="2" ry="3" transform="rotate(35 15.6 15)"/></g></symbol>
    <symbol id="i-fame" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.6-5 4.5 1.5 6.6L12 17l-6 3.4 1.5-6.6-5-4.5 6.6-.6z" fill="#ff8f6b"/></symbol>
    <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="#7fd0ff"/></symbol>
    <symbol id="i-scroll" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></symbol>
    <symbol id="i-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></symbol>
    <symbol id="i-heart-fill" viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="currentColor"/></symbol>
    <symbol id="i-crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 18h16l1-11-5 4-4-6-4 6-5-4z"/></symbol>
    <symbol id="i-cup" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 5h12l-2 8a4 4 0 0 1-8 0zM12 17v3M8 21h8"/></symbol>
    <symbol id="i-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 11l9-7 9 7M6 10v10h12V10"/></symbol>
    <symbol id="i-people" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/></symbol>
  </defs></svg>;
}
export function LineIcon({ name, size = 26 }: {
    name: string;
    size?: number;
}) { return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><use href={`#i-${name}`}/></svg>; }
export const RES_LABEL = { coin: '엽전', grain: '곡식', fame: '명성', stamina: '기력' };
export function ResIcon({ kind, size = 20 }: {
    kind: IconKind;
    size?: number;
}) { return <LineIcon name={{ coin: 'coin', grain: 'rice', fame: 'fame', stamina: 'bolt' }[kind]} size={size}/>; }
export function NavIcon({ name }: {
    name: 'home' | 'yokai' | 'stage' | 'record';
}) { return <LineIcon name={{ home: 'home', yokai: 'people', stage: 'flag', record: 'scroll' }[name]}/>; }
export function VillageScene({ rank: _rank }: {
    rank: number;
}) { return <Art className="scene-img" src={ART.bg('palace')} fallback={<div className="art-placeholder"/>}/>; }
export function ChapterArt({ id }: {
    index: number;
    id: string;
}) { return <Art className="scene-img" src={ART.chapter(id)} fallback={<div className="art-placeholder">토벌</div>}/>; }
export function FoeGroup({ chapterId }: {
    chapterId: string;
    tint?: string;
}) { return <Art className="portrait" src={ART.foe(chapterId)} fallback={<div className="art-placeholder">적 무리</div>}/>; }
export function Burst() { return null; }
