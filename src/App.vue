<script setup lang="ts">
// import HelloWorld from './components/HelloWorld.vue';
import DrawPixelImage from "./components/DrawPixelImage.vue";
import Header from "./Header.vue";
import { t } from "./store/i18n";
</script>

<template>
  <div class="container">
    <Header />
    <div class="content">
      <DrawPixelImage />
    </div>

    <footer class="footer">
      <div class="footer-content">
        <span>© 2026 Pixel Converter Tool</span>
        <span class="divider">|</span>
        <span>Built with Vue 3 + Element Plus</span>
        <span class="divider">|</span>
        <span>Created by {{t("machi")}} & {{t("sicilianSoda")}}</span>
        <span class="divider">|</span>
        <span>{{t("disclaimer")}}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1; 
  display: flex;
  flex-direction: column;
  justify-content: center; 
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px;
  margin-bottom: auto;
}

.footer {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #111;
  color: #aaa;
  padding: 12px 16px;
  font-size: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 8px;
}

.footer-content {
  display: flex;
  gap: 12px;
  align-items: center;
}

.divider {
  opacity: 0.4;
}


/* RWD */
@media (max-width: 1199px) {
  .content {
    padding: 16px;
  }

  .footer-content {
    gap: 8px;
  }

  .footer {
    font-size: 13px;
  }
}

@media (max-width: 767px) {

  .content {
    padding: 12px;
    align-items: stretch;
  }

  .footer {
    text-align: center;
    font-size: 12px;
  }

  .footer-content {
    flex-direction: column;
    gap: 6px;
  }

  .divider {
    display: none;
  }
}

</style>
