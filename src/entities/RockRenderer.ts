import type { RockDefinition } from '../data/types';

export interface RockPose { x: number; y: number; impactX: number; impactY: number; damageRatio: number; breaking: number; entering: number }

const OUTLINE: Array<[number, number]> = [
  [-112, 52], [-104, 9], [-91, -39], [-64, -76], [-24, -96], [18, -91], [58, -78], [92, -46],
  [108, -8], [101, 43], [78, 73], [35, 88], [-15, 84], [-59, 79], [-92, 68],
];

/** Procedural rock skin isolated from game rules so an image/sprite renderer can replace it later. */
export class RockRenderer {
  draw(context: CanvasRenderingContext2D, rock: RockDefinition, pose: RockPose): void {
    const { x, y, damageRatio, breaking, entering } = pose;
    const settle = Math.sin(Math.min(1, entering) * Math.PI) * 7;
    context.save();
    context.translate(x, y + settle + breaking * 78);
    context.scale(1 + entering * 0.04, Math.max(0.15, 1 - breaking * 0.7));
    context.rotate(breaking * 0.05);

    context.fillStyle = 'rgba(15, 12, 9, .55)';
    context.beginPath(); context.ellipse(5, 87, 116 + breaking * 30, 22 - breaking * 7, 0, 0, Math.PI * 2); context.fill();

    this.path(context);
    const gradient = context.createLinearGradient(-85, -90, 95, 75);
    gradient.addColorStop(0, this.lighten(rock.color, 28));
    gradient.addColorStop(0.43, rock.color);
    gradient.addColorStop(1, rock.shadow);
    context.fillStyle = gradient; context.fill();
    context.lineWidth = 5; context.strokeStyle = '#40362f'; context.stroke();

    // broad planes make the silhouette feel hewn rather than flat
    this.plane(context, [[-88,-34],[-58,-70],[-22,-86],[4,-58],[-20,-18],[-67,-7]], 'rgba(240,220,185,.10)');
    this.plane(context, [[4,-58],[54,-67],[87,-36],[62,-6],[20,-17]], 'rgba(255,238,205,.055)');
    this.plane(context, [[20,-17],[62,-6],[88,43],[45,72],[9,46]], 'rgba(30,24,20,.20)');
    this.plane(context, [[-69,2],[-21,-16],[8,47],[-18,76],[-66,64]], 'rgba(25,21,18,.13)');

    // pits and mineral mottling
    const pits = [[-65,23,8,4],[-37,-49,5,3],[49,-40,7,4],[63,28,5,3],[-13,49,8,3],[18,-69,4,3]];
    for (const [px,py,rx,ry] of pits) { context.fillStyle = 'rgba(38,30,25,.25)'; context.beginPath(); context.ellipse(px!,py!,rx!,ry!,-.2,0,Math.PI*2); context.fill(); }
    context.fillStyle = 'rgba(205,175,128,.12)'; context.beginPath(); context.arc(-45,-22,13,0,Math.PI*2); context.fill();

    this.cracks(context, damageRatio);
    this.chippedEdges(context, damageRatio);
    context.restore();
  }

  private cracks(context: CanvasRenderingContext2D, ratio: number): void {
    const stage = ratio <= .08 ? 4 : ratio <= .25 ? 3 : ratio <= .5 ? 2 : ratio <= .75 ? 1 : 0;
    const crackSets = [
      [[20,-70],[10,-40],[28,-17],[16,7],[34,29]],
      [[-76,-21],[-49,-11],[-32,12],[-40,38],[-25,59]],
      [[74,-30],[52,-19],[44,5],[66,19]],
      [[-10,2],[6,22],[-5,44],[5,67]],
    ];
    context.strokeStyle = '#3b312a'; context.lineWidth = 2.4; context.lineCap = 'round'; context.lineJoin = 'round';
    for (let i=0;i<stage;i++) { const points=crackSets[i]!; context.beginPath(); points.forEach(([x,y],index)=>index?context.lineTo(x!,y!):context.moveTo(x!,y!)); context.stroke(); }
  }

  private chippedEdges(context: CanvasRenderingContext2D, ratio: number): void {
    if (ratio > .5) return;
    context.fillStyle = '#352d27';
    context.beginPath(); context.moveTo(-107,18); context.lineTo(-91,5); context.lineTo(-94,34); context.closePath(); context.fill();
    if (ratio <= .25) { context.beginPath(); context.moveTo(76,-63); context.lineTo(91,-46); context.lineTo(69,-37); context.closePath(); context.fill(); }
  }

  private path(context: CanvasRenderingContext2D): void { context.beginPath(); OUTLINE.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y)); context.closePath(); }
  private plane(context: CanvasRenderingContext2D, points: number[][], color: string): void { context.fillStyle=color;context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x!,y!):context.moveTo(x!,y!));context.closePath();context.fill(); }
  private lighten(hex: string, amount: number): string { const value=parseInt(hex.slice(1),16);return `rgb(${Math.min(255,(value>>16)+amount)},${Math.min(255,((value>>8)&255)+amount)},${Math.min(255,(value&255)+amount)})`; }
}
