import type { ItemDefinition } from '../data/types';
export class DroppedItem {
 x:number;y:number;vx:number;vy:number;rotation=0;vr:number;settled=false;age=0;radius=27;
 constructor(public item:ItemDefinition,x:number,y:number,impulse:number){this.x=x;this.y=y;this.vx=(Math.random()-.5)*impulse;this.vy=-260-Math.random()*110;this.vr=(Math.random()-.5)*5}
 update(dt:number,ground:number){if(this.settled)return;this.age+=dt;this.vy+=760*dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.rotation+=this.vr*dt;if(this.y+this.radius>=ground){this.y=ground-this.radius;if(Math.abs(this.vy)>70&&this.age<1.8){this.vy*=-.38;this.vx*=.68;this.vr*=.65}else{this.vy=0;this.vx=0;this.vr=0;this.settled=true}}}
 hit(x:number,y:number){return Math.hypot(this.x-x,this.y-y)<=this.radius+10}
}
