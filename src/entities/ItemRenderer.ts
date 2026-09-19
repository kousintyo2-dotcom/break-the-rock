import type { ItemDefinition } from '../data/types';

/** Small specimen illustrations shared by drops; intentionally static once settled. */
export function drawItem(context: CanvasRenderingContext2D, item: ItemDefinition): void {
  context.save(); context.lineJoin = 'round'; context.lineCap = 'round'; context.strokeStyle = '#2b2119'; context.lineWidth = 2;
  if (item.id === 'iron-flake') {
    context.fillStyle = '#a9563d'; context.beginPath(); context.moveTo(-20,8); context.lineTo(-12,-15); context.lineTo(5,-20); context.lineTo(20,-5); context.lineTo(13,17); context.lineTo(-7,20); context.closePath(); context.fill(); context.stroke();
    context.fillStyle='#d07b58'; context.fillRect(-8,-10,9,5); context.fillStyle='#743727';context.fillRect(4,3,10,7);
  } else if (item.id === 'quartz') {
    context.fillStyle='#d9d0ba'; for(const [x,y,h] of [[-11,5,26],[2,1,34],[12,8,22]] as const){context.beginPath();context.moveTo(x-7,18);context.lineTo(x-6,y);context.lineTo(x,y-h);context.lineTo(x+7,y);context.lineTo(x+8,18);context.closePath();context.fill();context.stroke();}
    context.strokeStyle='#fff8df';context.lineWidth=2;context.beginPath();context.moveTo(2,-25);context.lineTo(2,13);context.stroke();
  } else {
    context.fillStyle=item.color; context.beginPath(); context.arc(0,0,20,0,Math.PI*2); context.fill(); context.stroke(); context.fillStyle='#282018';context.font='bold 20px serif';context.textAlign='center';context.textBaseline='middle';context.fillText(item.glyph,0,1);
  }
  context.restore();
}
