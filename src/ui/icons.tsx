import { ART } from '../data/art';
import type { ResourceKey } from '../core/types';
import { Art } from './Portrait';
export type IconKind = ResourceKey;
export function IconSymbols() {
    return <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}><defs>
    <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" fill="#f6e7cf" stroke="#9a6a4a" strokeWidth="1.4" strokeLinejoin="round"/><path d="M12 6v14" stroke="#9a6a4a" strokeWidth="1.2"/></symbol>
    <symbol id="i-shop" viewBox="0 0 24 24"><path d="M3 9l2-5h14l2 5z" fill="#d9566b"/><path d="M5 9h14v11H5z" fill="#f6e7cf" stroke="#9a6a4a" strokeWidth="1.2"/><path d="M10 20v-6h4v6" fill="#9a6a4a"/></symbol>
    <symbol id="i-grass" viewBox="0 0 24 24"><path d="M3 19c3-6 6-9 9-9s6 3 9 9z" fill="#9cc58a"/><path d="M7 19l2-7M12 19V9M17 19l-2-7" stroke="#4f7a43" strokeWidth="1.4" strokeLinecap="round"/></symbol>
    <symbol id="i-gate" viewBox="0 0 24 24"><path d="M4 21V9a8 8 0 0 1 16 0v12z" fill="#5a4a52"/><path d="M8 21v-9a4 4 0 0 1 8 0v9z" fill="#231b24"/><circle cx="12" cy="7" r="1.3" fill="#e8b960"/></symbol>
    <symbol id="i-letter" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="1.5" fill="#f6e7cf" stroke="#9a6a4a" strokeWidth="1.2"/><path d="M8 9h8M8 12h8M8 15h5" stroke="#d9566b" strokeWidth="1.3" strokeLinecap="round"/></symbol>
    <symbol id="i-chest" viewBox="0 0 24 24"><path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1H3z" fill="#b07a26"/><path d="M3 11h18v8H3z" fill="#d39a35"/><rect x="10.5" y="10" width="3" height="4" fill="#3a2a10"/></symbol>
    <symbol id="i-jade" viewBox="0 0 24 24"><path d="M12 2.5l7 6-7 13-7-13z" fill="#4fc0a0"/><path d="M12 2.5l7 6H5z" fill="#8fe3c8"/><path d="M12 8.5v13" stroke="#2f8a72" strokeWidth="1"/></symbol>
    <symbol id="i-lantern" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M10 3h4M12 3v2"/><path d="M7 9c0-2.2 2.2-4 5-4s5 1.8 5 4v6c0 2.2-2.2 4-5 4s-5-1.8-5-4z"/><path d="M7 12h10M10 19v2h4v-2"/></symbol>
    <symbol id="i-swords" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l9 9M20 4l-9 9M6 15l3 3M18 15l-3 3M3 21l3-3M21 21l-3-3"/></symbol>
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
export const RES_LABEL: Record<ResourceKey, string> = { coin: '엽전', jade: '옥', exp: '수련치', fame: '명성' };
export function ResIcon({ kind, size = 20 }: {
    kind: IconKind;
    size?: number;
}) { return <LineIcon name={{ coin: 'coin', jade: 'jade', fame: 'fame', exp: 'bolt' }[kind]} size={size}/>; }
export function NavIcon({ name }: {
    name: 'home' | 'yokai' | 'camp' | 'gacha' | 'record';
}) { return <LineIcon name={{ home: 'home', yokai: 'people', camp: 'swords', gacha: 'lantern', record: 'scroll' }[name]}/>; }
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
