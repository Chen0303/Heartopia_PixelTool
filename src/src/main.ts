import { createApp } from 'vue';
import { fetchSheetTranslations } from "./utils/GoogleSheetToJson";
import './style.css';
import App from './App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { translations } from "./store/i18n";


(async function bootstrap() {
  const sheetId = "17x5S_970f4Y9ccc23OX5qmmLXndZi3YVgFAQau1Pvik";
  translations.value = await fetchSheetTranslations(sheetId);

  window.__TRANSLATIONS__ = translations;

  const app = createApp(App);

  app.use(ElementPlus);

  app.mount("#app"); 
})();
