import './assets/styles.css';import {GameStore} from './systems/GameStore';import {AppShell} from './ui/AppShell';
const app=document.querySelector<HTMLElement>('#app');if(!app)throw new Error('App mount not found');new AppShell(app,new GameStore());
