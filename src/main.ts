// First, so that the early `beforeinstallprompt` event is not missed.
import './lib/install.svelte';
import { initUpdates } from './lib/update.svelte';
import '@fontsource-variable/inter';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

initUpdates();

export default mount(App, { target: document.getElementById('app')! });
