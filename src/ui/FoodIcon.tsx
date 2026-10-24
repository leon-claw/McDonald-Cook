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
      {id === 'roast-sauce' && <g stroke="#704729" strokeWidth="3"><rect x="36" y="35" width="48" height="63" rx="12" fill="#a96c3c"/><rect x="44" y="22" width="32" height="17" rx="4" fill="#6d4d30"/><path d="M40 57h40v24H40z" fill="#eed7a2"/><path d="m52 75 5-10m7 10 5-10" stroke="#9e6734"/></g>}
      {id === 'fries' && <g stroke="#b77b35" strokeWidth="2" strokeLinejoin="round"><path d="m29 68-6-35 11-3 8 39m-3-5-1-43 12-1 3 45m3-2 6-43 12 2-5 44m6 1 12-35 10 4-11 36" fill="#f5ce69"/><path d="M23 58c14 11 57 12 74 0l-9 40H32Z" fill="#c45f43" stroke="#9d4a35"/><path d="M46 84c1-15 7-14 13 0 5-14 12-15 14 0" stroke="#ffdf7a" strokeWidth="4" strokeLinecap="round"/></g>}
    </svg>
  );
}

/** Recipe illustrations use the same variant as the 3D reveal. */
export function DishIcon({ recipe, size = 260 }: { recipe: Recipe; size?: number }) {
  const id = recipe.modelVariant;
  const uid = useId().replaceAll(':', '');
  if (id === 'fries') return <FoodIcon id="fries" size={size}/>;
  const big = id === 'big-mac', fish = id === 'fish' || id === 'double-fish';
  const double = big || id === 'double-beef' || id === 'double-fish';
  const chicken = ['chicken','spicy-chicken','grilled-chicken'].includes(id);
  const cheese = ['cheeseburger','double-beef','big-mac','angus','fish','double-fish'].includes(id);
  const patty = fish ? '#d9a348' : chicken ? id === 'grilled-chicken' ? '#9c602f' : '#cf8b37' : '#754632';
  return <svg width={size} height={size * .8} viewBox="0 0 300 240" fill="none" aria-hidden="true" className="dish-icon">
    <defs><linearGradient id={`bun-${uid}`} x1="110" y1="40" x2="170" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe3a0"/><stop offset="1" stopColor="#d9984f"/></linearGradient></defs>
    <ellipse cx="150" cy="214" rx="112" ry="12" fill="#18382c" opacity=".13"/>
    <path d="M30 183h240l-15 28H45Z" fill="#f5e5bb" stroke="#cbb68c" strokeWidth="3"/>
    {recipe.kind === 'burger' ? <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="3">
      <path d="M55 173h190l-8 23c-14 20-163 20-175 0Z" fill={`url(#bun-${uid})`} stroke="#ad793c"/>
      <rect x="51" y="148" width="198" height="30" rx={fish?5:16} fill={patty} stroke="#916131"/>
      {cheese&&<path d="m51 146 50 7 28 20 27-16 55 5 37-17-35-9H80Z" fill="#f4c745" stroke="#c69837"/>}
      {big&&<rect x="54" y="125" width="192" height="21" rx="9" fill="#eab875" stroke="#ad793c"/>}
      {double&&<rect x="51" y={big?101:118} width="198" height="26" rx={fish?5:14} fill={patty} stroke="#916131"/>}
      {id==='angus'&&<rect x="55" y="130" width="190" height="15" rx="8" fill="#df6541" stroke="#b54930"/>}
      {(big||chicken||id==='angus')&&<path d={`M50 ${big?104:130}q15-13 30-1t30 0t30 0t30 0t30 0t30 0l17 7-6 11q-17-10-32 0t-30 0t-30 0t-30 0t-30 0t-32-2Z`} fill="#91b958" stroke="#65883e"/>}
      <path d={big?'M50 98c0-44 39-66 100-66s100 22 100 66c-32 16-168 16-200 0Z':double?'M50 115c0-44 39-66 100-66s100 22 100 66c-32 16-168 16-200 0Z':'M50 136c0-44 39-66 100-66s100 22 100 66c-32 16-168 16-200 0Z'} fill={`url(#bun-${uid})`} stroke="#ad793c"/>
      {(big||chicken||id==='angus')&&<g transform={`translate(0 ${big?0:double?17:38})`} stroke="#fff3c9" strokeWidth="5"><path d="m92 72 6-4m29-12 4-6m33 11 7 2m25 11 5-3m-81 22 7-3m36 2 5-4m49 6 5 3"/></g>}
    </g> : id === 'cheese-sticks' ? <g stroke="#aa7535" strokeWidth="3">
      {[0,1,2].map(i=><rect key={i} x={65+i*52} y="80" width="38" height="111" rx="15" fill="#e0b05a" transform={`rotate(${i*6-6} ${84+i*52} 135)`}/>)}
      <path d="M105 80q42-36 67-31" stroke="#fff2bf" strokeWidth="8"/><rect x="166" y="24" width="53" height="36" rx="12" fill="#dfac52"/>
    </g> : <g stroke="#ac7536" strokeWidth="3">
      {(id==='wings'?[0,1]:[0,1,2,3,4]).map(i=><g key={i} transform={`translate(${id==='wings'?85+i*110:75+(i%3)*70} ${id==='wings'?140:120+Math.floor(i/3)*47}) rotate(${i*27-14})`}>
        <ellipse rx={id==='wings'?42:37} ry={id==='wings'?59:28} fill={id==='wings'?'#c4873c':'#e0b15e'}/><path d="m-15-12 9 3m7 15 7-4m-20 12 6 3" stroke="#f6ce78" strokeWidth="5"/>
      </g>)}
    </g>}
  </svg>;
}
