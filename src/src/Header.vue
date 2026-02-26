<template>
  <div class="header">
    <!-- <div class="header-bg"><BGIcon /></div> -->
    <!-- <div class="logo"></div> -->
    <div class="header-inner">
      <nav class="nav">
        <a href="#">{{ t("pixelConverter") }} </a>
      </nav>
    </div>
    <div class="lang-dropdown" @click="toggleDropdown" ref="dropdownRef">
        <div class="lang-selected">
          <Earth24Filled class="earth-icon"/>
          <span class="text">{{ currentLangLabel }}</span>
          <el-icon class="arrow" :class="{ open: dropdownOpen }"><CaretBottom /></el-icon>
        </div>
        <ul v-show="dropdownOpen" class="lang-options">
          <li v-for="(label, code) in languages" :key="code" @click.stop="setLang(code)">
            {{ label }}
          </li>
        </ul>
      </div>
  </div>
</template>

<script setup lang="ts">
// import BGIcon from "./assets/img/headerBG.svg";
import { Earth24Filled } from "@vicons/fluent";
import { CaretBottom } from "@element-plus/icons-vue";
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { currentLang, t } from "./store/i18n";

const languages = {
  zh: "中",
  en: "EN"
} as const;

type Lang = keyof typeof languages;

const dropdownOpen = ref(false);
const currentLangLabel = computed(() => languages[currentLang.value]);

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}

function setLang(code: Lang) {
  currentLang.value = code;
  dropdownOpen.value = false;
}

// 點擊頁面其他地方關閉 dropdown
const dropdownRef = ref<HTMLElement | null>(null);
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onBeforeUnmount(() => document.removeEventListener("click", handleClickOutside));

</script>

<style scoped>
.header {
  position: relative;
  height: 70px;
  background-color: var(--bg-light);
  display: flex;
  align-items: center;
}

.header-bg {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

/* .header-bg svg {
  display: block;
  left: 0;
  bottom: 0;
  height: 100%;
  width: auto;
} */

.header-inner {
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: flex-start;
  position: relative;
  z-index: 1;
  padding: 0 24px;
}

.logo {
  display: flex;
  color: var(--bg-main);
  font-weight: bold;
  font-size: 20px;
  z-index: 1;
}

.nav {
  display: flex;
  gap: 28px;
}

.nav a {
  text-decoration: none;
  color: var(--text-main);
  font-size: 24px;
  font-weight: 600;
}


/* 下拉選單 */
.lang-dropdown {
  display: flex;
  cursor: pointer;
  user-select: none;
  height: 40px;
  width: 70px;
  font-size: 14px;
  justify-content: center;
  margin-right: 8px;
  position: relative;
}

.lang-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  width: 70px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.lang-selected:hover{
  background-color: var(--hover-bg-color);
  color: var(--bg-light);
}

.lang-selected .svg {
  margin-right: 8px;
}

.earth-icon {
  width: 20px; 
  height: 20px;
}

.lang-selected .arrow {
  margin-left: 6px;
  transition: transform 0.2s;
}

.el-icon:hover {
  fill: var(--bg-light);
}

.lang-selected .arrow.open {
  transform: rotate(180deg);
}

.lang-options {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  margin-top: 6px;
  width: 100%;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  list-style: none;
  padding: 4px 0;
}

.lang-options li {
  padding: 6px 12px;
  cursor: pointer;
}

.lang-options li:hover {
  background-color: #f0f0f0;
}
</style>
