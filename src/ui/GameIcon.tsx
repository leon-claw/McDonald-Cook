import type { ReactNode } from 'react';

export type GameIconName = 'heart' | 'bag' | 'book' | 'sound' | 'muted' | 'pot' | 'sun' | 'all' | 'grain' | 'protein' | 'leaf' | 'seasoning' | 'snack' | 'quest';

const drawings: Record<GameIconName, ReactNode> = {
  heart: <path d="M12 21 3.4 12.4C-2 6.7 5.3.1 12 6.2 18.7.1 26 6.7 20.6 12.4Z" fill="currentColor" stroke="none"/>,
  bag: <><path d="m7 7-2 4-1 10h16l-1-10-2-4Z" fill="currentColor" fillOpacity=".85"/><path d="M8 7V4h8v3M8 13h8v5H8Z"/><path d="M8 13h8v5H8Z" stroke="#263538"/></>,
  book: <><path d="M4 3h13l3 3v15H4ZM8 3v18"/><path d="m12 8 4 3-4 5Z" fill="currentColor" stroke="none"/><path d="M4 6H2m2 5H2m2 5H2"/></>,
  sound: <><path d="M3 9h4l5-5v16l-5-5H3Z" fill="currentColor" stroke="none"/><path d="M16 8q4 4 0 8m3-11q7 7 0 14"/></>,
  muted: <><path d="M3 9h4l5-5v16l-5-5H3Z" fill="currentColor" stroke="none"/><path d="m16 9 6 6m0-6-6 6"/></>,
  pot: <><path d="M4 10h16l-2 10H6Z" fill="currentColor" fillOpacity=".85"/><path d="M1 11h3m16 0h3M7 7c-3-3 3-3 0-6m5 6c-3-3 3-3 0-6m5 6c-3-3 3-3 0-6"/></>,
  sun: <><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
  all: <><path d="M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z" fill="currentColor" fillOpacity=".8" stroke="none"/></>,
  grain: <><path d="m7 22 9-19M12 12C5 13 4 7 4 7c5 0 8 2 8 5Zm-3 6c-6 0-7-5-7-5 4-1 7 1 7 5Zm6-12c-5-1-5-6-5-6 4 1 6 3 5 6Zm-1 3c6 1 8-4 8-4-5-1-7 1-8 4Zm-3 7c6 1 9-4 9-4-5-2-8 1-9 4Z"/></>,
  protein: <><path d="M5 4c4-4 14 1 14 7 0 4-6 5-9 2S1 8 5 4Z" fill="currentColor" fillOpacity=".8"/><path d="m13 15 5 5m-2 1c-2 3 3 3 3 0 3 1 4-4 1-3"/></>,
  leaf: <><path d="M3 20C0 8 12 1 22 2c0 12-8 22-19 18Z" fill="currentColor" fillOpacity=".8"/><path d="m4 20 13-13m-9 9V9m0 7 8-1" stroke="#263538"/></>,
  seasoning: <><path d="M9 3h6v4l3 4v10H6V11l3-4ZM8 2h8M7 13h10m-10 4h10"/><path d="M7 13h10v4H7Z" fill="currentColor" fillOpacity=".7"/></>,
  snack: <><path d="m5 11-2-8 3-1 2 9m2 0V1h3v10m2 0 2-9 3 1-2 8M3 10l3 12h12l3-12-9 3Z"/><path d="m3 10 3 12h12l3-12-9 3Z" fill="currentColor" fillOpacity=".8"/></>,
  quest: <><path d="m12 2 10 10-10 10L2 12Z"/><path d="m12 7 5 5-5 5-5-5Z" fill="currentColor" stroke="none"/></>,
};

export function GameIcon({ name, size = 24, className = '' }: { name: GameIconName; size?: number; className?: string }) {
  return <svg className={`game-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}
