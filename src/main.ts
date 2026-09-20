import './assets/styles.css';
import { PlayScene } from './scenes/PlayScene';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('App mount not found');

const scene = new PlayScene();
app.replaceChildren(scene.root);
