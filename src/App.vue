<template>
  <div class="container">
    <div class="pixel-bg">
      <canvas ref="mountainCanvas"></canvas>
    </div>
    <Header />
    <div class="content">
      <DrawPixelImage />
    </div>

    <footer class="footer">
      <div class="footer-content">
        <span>© 2026 Pixel Converter Tool</span>
        <span class="divider">|</span>
        <span class="container_site"> 👁 Visitors: {{ visitors }} </span>

        <span class="divider">|</span>
        <span>Built with Vue 3 + Element Plus</span>
        <span class="divider">|</span>
        <span>Created by {{ t("machi") }} & {{ t("sicilianSoda") }}</span>
        <span class="divider">|</span>
        <span>{{ t("disclaimer") }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// import HelloWorld from './components/HelloWorld.vue';
import DrawPixelImage from "./components/DrawPixelImage.vue";
import Header from "./Header.vue";
import { t } from "./store/i18n";
import { ref, onMounted } from "vue";
import { incrementVisitor, getVisitorCount } from "./firebase";

const visitors = ref(0);
const mountainCanvas = ref<HTMLCanvasElement | null>(null);

function generateMountain() {
  const canvas = mountainCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pixel = 30;

  const width = window.innerWidth;
  const height = 300;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  const columns = Math.floor(width / pixel);

  let currentHeight = Math.random() * 6 + 4;

  for (let i = 0; i < columns; i++) {

    currentHeight += Math.floor(Math.random() * 3 - 1);
    currentHeight = Math.max(3, Math.min(10, currentHeight));

    for (let j = 0; j < currentHeight; j++) {

      let color = "#e89623"; // 主色

      const heightRatio = j / currentHeight;

      const r = Math.random();

      if (heightRatio < 0.3) {
        // 山底陰影
        if (r < 0.6) color = "#2b1602";
        else color = "#a85a2a";
      } 
      else if (heightRatio < 0.8) {
        // 山體
        if (r < 0.2) color = "#2b1602";
        else if (r < 0.4) color = "#a85a2a";
        else color = "#e89623";
      } 
      else {
        // 山頂
        if (r < 0.15) color = "#ffffff";
        else if (r < 0.35) color = "#a85a2a";
        else color = "#e89623";
      }

      ctx.fillStyle = color;

      ctx.fillRect(
        i * pixel,
        height - (j + 1) * pixel,
        pixel,
        pixel
      );
    }
  }
}

onMounted(async () => {
  generateMountain();
  const visited = localStorage.getItem("visited");

  if (!visited) {
    await incrementVisitor();
    localStorage.setItem("visited", "1");
  }

  visitors.value = await getVisitorCount();
  
  window.addEventListener("resize", generateMountain);
});
</script>

<style scoped>
.container {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.pixel-bg {
  position: absolute;
  bottom: 80px; /* 避開 footer */
  left: 0;
  width: 100%;
  height: 300px;

  pointer-events: none;
  z-index: 0;
}

.pixel-bg canvas {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

header,
.content,
.footer {
  position: relative;
  z-index: 2;
}

.content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px;
  width: 100%;
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

.container_site {
  font-size: 14px;
  color: #aaa;
  margin-right: 10px;
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
