export interface Particle{x:number;y:number;vx:number;vy:number;life:number;size:number;color:string}
export const impactParticles=(x:number,y:number,color:string,count=8):Particle[]=>Array.from({length:count},()=>({x,y,vx:(Math.random()-.5)*210,vy:-40-Math.random()*170,life:.35+Math.random()*.3,size:2+Math.random()*5,color}));
export const updateParticles=(list:Particle[],dt:number)=>list.filter(p=>{p.life-=dt;p.vy+=400*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.life>0});
