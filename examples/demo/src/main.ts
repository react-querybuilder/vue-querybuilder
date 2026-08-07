import { createApp } from 'vue';
// The same import line a real consumer writes. Vite aliases it to the byte-identical
// stylesheet in `@react-querybuilder/core`, so the demo runs without a library build.
import '@react-querybuilder/vue/dist/query-builder.css';
import App from './App.vue';
import './demo.css';

createApp(App).mount('#app');
