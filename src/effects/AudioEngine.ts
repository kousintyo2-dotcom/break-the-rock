export class AudioEngine { private ctx?:AudioContext; enabled=true;
 private tone(freq:number,duration:number,volume:number,type:OscillatorType='sine'){if(!this.enabled)return;this.ctx??=new AudioContext();const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.ctx.currentTime);g.gain.setValueAtTime(volume,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+duration);o.connect(g).connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+duration)}
 hit(){this.tone(92,.07,.07,'triangle')} collect(){this.tone(520,.12,.045);setTimeout(()=>this.tone(720,.1,.03),45)} break(){this.tone(64,.18,.1,'sawtooth')}
}
