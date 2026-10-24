import { useId } from 'react';
import type { IngredientId, Recipe } from '../game/data';

/** Original vector illustrations, shared by the inventory and recipe book. */
export function FoodIcon({ id, size = 96 }: { id: IngredientId; size?: number }) {
  const uid = useId().replaceAll(':', '');
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true" className="food-icon">
      <defs><linearGradient id={`bread-${uid}`} x1="35" y1="25" x2="78" y2="93" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe6a6"/><stop offset="1" stopColor="#cc7f38"/></linearGradient></defs>
      <ellipse cx="60" cy="99" rx="37" ry="7" fill="#102d24" opacity=".13"/>
      {id === 'bread' && <g stroke="#966030" strokeWidth="2.5" strokeLinejoin="round"><path d="M19 67c-5-27 15-44 40-44 27 0 47 18 43 44-2 11-19 18-42 18S20 78 19 67Z" fill={`url(#bread-${uid})`}/><path d="M21 69c15 11 58 13 79-1v13c-2 11-18 16-40 16-22 0-36-5-39-15Z" fill="#eab569"/><path d="m37 42 5-4m14 2 3-5m17 10 6-1m-34 12 5-3m21 9 5-3" stroke="#fff4cf" strokeWidth="4" strokeLinecap="round"/></g>}
      {id === 'beef' && <g stroke="#603c2b" strokeWidth="2.5"><path d="M17 59c0-15 21-25 44-25 24 0 43 10 43 25v15c0 14-21 23-44 23-22 0-42-9-43-22Z" fill="#89513b"/><ellipse cx="60" cy="59" rx="43" ry="24" fill="#a16a46"/><path d="m32 47 48 24M44 40l50 24M25 59l39 20" stroke="#603c2b" strokeWidth="5" strokeLinecap="round"/><path d="m29 74 3 6m46-3 1 6m-25-1 4 5" stroke="#bb8258" strokeWidth="3"/></g>}
      {id === 'chicken' && <g stroke="#a47139" strokeWidth="2.5" strokeLinejoin="round"><path d="m81 70 16 16 4-2c8-2 13 8 7 12-2 1-3 2-4 6-4 7-14 0-11-6L76 82Z" fill="#fff3d7"/><path d="M27 36c13-12 30-13 43-2 12 8 22 22 18 36-3 14-22 22-38 18-21-4-38-14-34-32 1-8 6-15 11-20Z" fill="#e6af55"/><path d="m34 43 8-5m15 12 9 1M28 63l7 4m19 7 7-3m14-12 3 6" stroke="#b77c37" strokeWidth="4" strokeLinecap="round"/></g>}
      {id === 'fish' && <g stroke="#547c81" strokeWidth="2.5" strokeLinejoin="round"><path d="m88 55 24-18-3 45-25-11" fill="#78b7bd"/><path d="M11 64c14-28 33-36 55-29 16 5 26 16 30 27-10 21-32 28-50 25C30 85 18 77 11 64Z" fill="#acd6d3"/><path d="m45 37 13-16 15 17M50 86l15 13 7-16" fill="#80b9bc"/><path d="M37 42c13 11 12 27 1 40"/><circle cx="25" cy="61" r="3" fill="#284d50" stroke="none"/><path d="m60 50 8 8-8 8m17-13 7 8-8 8" stroke="#83bbba"/></g>}
      {id === 'cheese' && <g stroke="#b78a38" strokeWidth="2.5" strokeLinejoin="round"><path d="m17 59 58-29 28 35-57 31-29-18Z" fill="#efbe4f"/><path d="m17 59 30 19 56-13-29-36Z" fill="#ffdf73"/><path d="m47 78-1 18m-29-37 30 19"/><ellipse cx="61" cy="52" rx="7" ry="4" fill="#e7b445" stroke="none"/><ellipse cx="47" cy="65" rx="5" ry="3" fill="#e7b445" stroke="none"/><ellipse cx="77" cy="66" rx="5" ry="3" fill="#e7b445" stroke="none"/><path d="M73 73v11m-15-7v7" stroke="#bd913b" strokeWidth="4" strokeLinecap="round"/></g>}
      {id === 'lettuce' && <g stroke="#4e8143" strokeWidth="2.5" strokeLinejoin="round"><path d="M55 98C26 84 13 79 17 63 4 48 18 34 31 37c0-19 23-24 35-11 17-13 34 1 30 18 20 7 14 25-1 30 2 16-14 27-32 21l-8 3Z" fill="#8ab85e"/><path d="M57 96C51 75 41 56 31 45m27 39c12-15 22-27 32-34M55 70l9-36" stroke="#d2e7a1" strokeWidth="4" strokeLinecap="round"/><path d="m44 66-17-9m45 12 15 1" stroke="#c1db8a" strokeWidth="3"/></g>}
      {id === 'tomato' && <g stroke="#a44635" strokeWidth="2.5"><path d="M60 36c24-12 44 5 44 26 0 24-17 37-44 37-25 0-43-15-43-37 0-21 19-36 43-26Z" fill="#dd6950"/><path d="m60 43-20-8 15-4 8-16 3 18 19 1-15 11 2 11-12-8-13 6Z" fill="#6b994d" stroke="#51783e" strokeLinejoin="round"/><path d="M34 50c-6 4-8 10-7 16" stroke="#ff9e7c" strokeWidth="5" strokeLinecap="round"/></g>}
      {id === 'pickle' && <g stroke="#4f713d" strokeWidth="2.5"><path d="M28 86c-17-20-9-49 11-57C62 20 89 42 94 66c4 19-13 35-31 33-14 0-27-5-35-13Z" fill="#79a658"/><ellipse cx="58" cy="57" rx="21" ry="31" transform="rotate(-43 58 57)" fill="#c0ce7b"/><ellipse cx="58" cy="57" rx="12" ry="22" transform="rotate(-43 58 57)" fill="#dce29e" stroke="#abc06a"/><path d="m46 48 5 2m7 7 5 2m7 7 5 2" stroke="#8d9f56" strokeWidth="3" strokeLinecap="round"/><path d="m30 74 4 4m12 9 4 3m23 1 4-3" stroke="#557d3e" strokeWidth="3" strokeLinecap="round"/></g>}
      {id === 'chili' && <g stroke="#a44635" strokeWidth="2.5" strokeLinejoin="round"><path d="M42 34C22 48 39 69 64 78c16 7 25 9 35 14-3-15-18-25-25-41-6-16-20-23-32-17Z" fill="#d96543"/><path d="M45 36c-5-13 1-23 16-24l4 7c-12 0-15 6-13 16" fill="#6c9347" stroke="#57783c"/><path d="M43 48c-2 11 11 20 22 24" stroke="#fa9570" strokeWidth="5" strokeLinecap="round"/></g>}
      {id === 'fries' && <g stroke="#b77b35" strokeWidth="2" strokeLinejoin="round"><path d="m29 68-6-35 11-3 8 39m-3-5-1-43 12-1 3 45m3-2 6-43 12 2-5 44m6 1 12-35 10 4-11 36" fill="#f5ce69"/><path d="M23 58c14 11 57 12 74 0l-9 40H32Z" fill="#c45f43" stroke="#9d4a35"/><path d="M46 84c1-15 7-14 13 0 5-14 12-15 14 0" stroke="#ffdf7a" strokeWidth="4" strokeLinecap="round"/></g>}
    </svg>
  );
}

export function DishIcon({ recipe, size = 260 }: { recipe: Recipe; size?: number }) {
  const uid = useId().replaceAll(':', '');
  const beefCount = recipe.ingredients.filter(id => id === 'beef').length;
  const fish = recipe.ingredients.includes('fish');
  const chicken = recipe.ingredients.includes('chicken');
  const double = beefCount > 1;
  return (
    <svg width={size} height={size * .8} viewBox="0 0 300 240" fill="none" aria-hidden="true" className="dish-icon">
      <defs><linearGradient id={`bun-${uid}`} x1="113" y1="54" x2="173" y2="127" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe3a0"/><stop offset="1" stopColor="#d9984f"/></linearGradient><linearGradient id={`base-${uid}`} x1="150" y1="172" x2="150" y2="208" gradientUnits="userSpaceOnUse"><stop stopColor="#f1c478"/><stop offset="1" stopColor="#c58b47"/></linearGradient></defs>
      <ellipse cx="150" cy="216" rx="109" ry="12" fill="#18382c" opacity=".13"/>
      <path d="M32 199c32 20 205 20 236 0l-9 13c-38 20-180 20-218 0Z" fill="#dbd8bd"/>
      <ellipse cx="150" cy="198" rx="118" ry="17" fill="#fff5d5" stroke="#dfd4b5" strokeWidth="2"/>
      {recipe.kind === 'burger' && <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M56 173h188l-8 23c-11 22-163 21-175 1Z" fill={`url(#base-${uid})`} stroke="#b28143" strokeWidth="3"/>
        <path d="M54 169c14-10 21 9 34 2 18-12 26 7 41 0 14-10 21 10 39 0 16-10 25 7 38 0 15-8 25-3 39 3l-8 14c-15 10-22-7-38 1-16 8-25-7-40 1-17 10-22-7-37 0-18 9-25-8-40 1-13 8-22-3-28-9Z" fill="#81a953" stroke="#5c7f3f" strokeWidth="3"/>
        <path d="M55 143c13-15 175-15 190 0v21c-17 23-170 25-190 0Z" fill={fish || chicken ? '#ce974a' : '#754632'} stroke={fish || chicken ? '#a77b38' : '#573927'} strokeWidth="3"/>
        <path d="m70 152 9 5m17-9 9 4m20 6 9 3m24-9 11 4m27-7 9 4m14 4 9-4" stroke={fish || chicken ? '#edbd65' : '#a0734b'} strokeWidth="4"/>
        <path d="m52 140 47 5 27 23 27-22 57 7 37-15-30-14-129-2Z" fill="#f8d464" stroke="#cca33d" strokeWidth="2"/>
        {double && <><path d="M57 123c15-18 172-18 186 0v13c-22 18-167 20-186-1Z" fill="#805139" stroke="#593c2c" strokeWidth="3"/><path d="m63 120 35 6 31 18 31-17 59 3 21-14-78-6Z" fill="#f6d16b" stroke="#c79d43" strokeWidth="2"/></>}
        <path d={`M55 ${double ? '111' : '124'}c29-8 154-8 190 0l-1 9c-24 10-165 10-189 0Z`} fill="#db7052" stroke="#ae543b" strokeWidth="3"/>
        <path d={`M52 ${double ? '105' : '118'}c10-10 17 5 26-3 13-10 26 6 38 0 11-10 20 7 33-1 18-11 28 8 43 0 15-9 26 6 36-2 9-5 17-2 20 6l-9 10c-16 8-20-7-35 1-19 9-21-6-38 2-16 8-24-6-37 0-17 10-20-9-36 0-17 10-23-5-35-1Z`} fill="#98bc63" stroke="#6e914b" strokeWidth="3"/>
        <path d={`M50 ${double ? '105' : '118'}c0-45 39-72 101-72 61 0 98 29 99 72-32 16-166 16-200 0Z`} fill={`url(#bun-${uid})`} stroke="#ad793c" strokeWidth="3" transform={double ? 'translate(0 -5)' : undefined}/>
        <g stroke="#fff3c9" strokeWidth="5"><path d="m92 82 6-4m29-12 4-6m33 11 7 2m25 11 5-3m-81 22 7-3m36 2 5-4m49 6 5 3"/></g>
      </g>}
      {recipe.kind === 'fries' && <g transform="translate(30 -12) scale(2)"><FoodIcon id="fries" size={120}/></g>}
      {recipe.kind === 'dubious' && <g stroke="#52485e" strokeWidth="3" strokeLinejoin="round"><path d="M65 175c-11-17 4-33 22-35-5-23 19-39 41-27 14-25 46-20 51 2 29-10 50 13 37 33 22 3 31 22 17 36-25 20-148 19-168-9Z" fill="#8e8699"/><path d="M85 167c8-15 23-17 34-9 9-14 28-11 33 2 17-15 37-9 41 8" stroke="#b2a6b9" strokeWidth="7" strokeLinecap="round"/><circle cx="117" cy="145" r="5" fill="#c7c384" stroke="none"/><circle cx="185" cy="153" r="4" fill="#c7c384" stroke="none"/><path d="M104 107c-19-14 16-22 1-37m46 21c-19-15 16-22 1-37m40 50c-17-12 12-20 3-30" stroke="#9d93a4" strokeWidth="6" strokeLinecap="round" opacity=".6"/></g>}
    </svg>
  );
}
