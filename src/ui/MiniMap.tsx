import { useEffect, useState } from 'react';
import { useGameStore } from '../game/store';
import { heightAt, PICKUPS, TREES } from '../scene/world';
import { GameIcon } from './GameIcon';

export const MAP_SCALE = 2.6;
const coordinate = (value: number) => 100 + value * MAP_SCALE;

// Marching squares traces the same height field used by the world mesh.
function terrainContours() {
  const paths: string[] = [];
  for (let level = -3; level <= 3; level += .35) {
    const segments: string[] = [];
    for (let x = -38; x < 38; x += 2) for (let z = -38; z < 38; z += 2) {
      const corners = [[x, z], [x + 2, z], [x + 2, z + 2], [x, z + 2]];
      const heights = corners.map(([cx, cz]) => heightAt(cx, cz));
      const intersections: Array<[number, number]> = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if ((heights[edge] > level) === (heights[next] > level)) continue;
        const t = (level - heights[edge]) / (heights[next] - heights[edge]);
        intersections.push([coordinate(corners[edge][0] + (corners[next][0] - corners[edge][0]) * t), coordinate(corners[edge][1] + (corners[next][1] - corners[edge][1]) * t)]);
      }
      for (let i = 0; i + 1 < intersections.length; i += 2) segments.push(`M${intersections[i].map(v => v.toFixed(1)).join(',')}L${intersections[i + 1].map(v => v.toFixed(1)).join(',')}`);
    }
    paths.push(segments.join(''));
  }
  return paths;
}

const contours = terrainContours();
const trail = Array.from({ length: 39 }, (_, i) => { const z = i * 2 - 38; return `${i ? 'L' : 'M'}${coordinate(Math.sin(z * .22) * 1.2)},${coordinate(z)}`; }).join('');

export function MiniMap() {
  const collected = useGameStore(state => state.collected);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <aside className="minimap" aria-label="营地地图：三角为旅人，锅为营地，亮点为可拾取材料">
    <span className="map-north">N</span>
    <svg className="map-disc" viewBox="0 0 200 200" aria-hidden="true">
      <defs><radialGradient id="map-ground"><stop stopColor="#7a8060"/><stop offset="1" stopColor="#3c4b3d"/></radialGradient><clipPath id="map-clip"><circle cx="100" cy="100" r="92"/></clipPath></defs>
      <circle cx="100" cy="100" r="98" fill="#202f2c" fillOpacity=".65" stroke="#b9bda0" strokeWidth=".7"/>
      <circle cx="100" cy="100" r="94" fill="url(#map-ground)" stroke="#e7dfb0" strokeOpacity=".4"/>
      <g clipPath="url(#map-clip)">
        {contours.map((path, i) => <path key={i} d={path} fill="none" stroke="#c1bf89" strokeWidth=".65" opacity=".32"/>)}
        {TREES.map(([x, z, scale], i) => <circle key={i} cx={coordinate(x)} cy={coordinate(z)} r={scale * 3.4} fill="#263f34" opacity=".42"/>)}
        <path d={trail} stroke="#d8c593" strokeWidth="4" opacity=".28" fill="none"/>
        <ellipse cx="100" cy={coordinate(-4)} rx="9" ry="8" fill="#cfb77e" opacity=".27"/>
        <path d={`M${coordinate(-7.3)} ${coordinate(-4.8)}l4-8 5 8Z`} fill="#a6a786" stroke="#e0d3a2" strokeWidth=".65"/>
        {PICKUPS.filter(pickup => (collected[pickup.id] ?? 0) <= now).map(pickup => <circle key={pickup.id} cx={coordinate(pickup.x)} cy={coordinate(pickup.z)} r="1.6" fill="#f4e5ad" stroke="#546348" strokeWidth=".6"/>)}
        <g transform={`translate(100 ${coordinate(-4)})`}><path d="M-4-2h8L3 3h-6ZM-3-4q-2-2 0-3m3 3q-2-2 0-3m3 3q-2-2 0-3" fill="#f2bd69" stroke="#f2bd69" strokeWidth=".8"/></g>
        <g id="map-player" transform="translate(100 100)"><circle r="7" fill="#173a32" opacity=".3"/><path d="M0-6 4.5 5 0 2.5-4.5 5Z" fill="#fff2ac" stroke="#384d3b" strokeWidth=".8"/></g>
      </g>
      <path d="M100 3v4m0 186v4M3 100h4m186 0h4" stroke="#eee4b7"/>
    </svg>
    <div className="map-weather"><GameIcon name="sun" size={15}/><span>料理营地</span><span className="map-weather-line"/></div>
  </aside>;
}
