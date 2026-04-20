<template>
  <div class="overlay" @click.self="close">
    <div class="modal">
      <div class="top-bar">
        <span>{{ t("pixelPreview") }}</span>
        <el-icon @click="close">
          <CloseBold />
        </el-icon>
      </div>

      <div class="content">
        <div class="preview-wrapper" ref="wrapperRef">
          <div class="zoom-controls">
            <el-icon @click.stop="zoomIn">
              <ZoomIn />
            </el-icon>
            <el-icon @click.stop="zoomOut">
              <ZoomOut />
            </el-icon>
          </div>
          <canvas
            ref="previewCanvas"
            @mousemove="
              isDragging ? handleMouseMoveDrag($event) : handleMouseMove($event)
            "
            @mouseleave="hideTooltip"
            @mousedown="handleMouseDown"
            @mouseup="handleMouseUp"
            @mouseout="handleMouseUp"
          ></canvas>

          <!-- 單一 Tooltip -->
          <el-tooltip
            v-model:visible="tooltipVisible"
            :virtual-ref="virtualRef"
            virtual-triggering
            placement="top"
          >
            <template #content>
              <div class="tooltip-content">
                <div
                  class="color-block"
                  :style="{ background: currentColor.hex }"
                ></div>
                <div>
                  <div>
                    <b>Palette Index:</b>
                    {{ getPaletteIndex(currentColor.hex) }}
                  </div>
                  <div><b>HEX:</b> {{ currentColor.hex }}</div>
                  <div><b>RGB:</b> {{ currentColor.rgb }}</div>
                </div>
              </div>
            </template>
          </el-tooltip>
        </div>
        <div class="colorMain">
          <!-- 遊戲顏色色塊面板 -->
          <div class="palette-panel">
            <div
              v-for="group in groupedPalette"
              :key="group[0]?.group ?? 'unknown'"
              class="palette-group"
            >
              <!-- 主色 -->
              <div class="palette-main" v-if="group[0]">
                <div
                  class="palette-block"
                  :class="{
                    highlighted:
                      normalizeHex(group[0].hex) ===
                        normalizeHex(highlightedHex) && !selectedHex,
                    selected:
                      normalizeHex(group[0].hex) === normalizeHex(selectedHex),
                  }"
                  :style="{
                    background: colorsInCanvas.has(
                      toHexFromPalette(group[0].hex),
                    )
                      ? group[0].hex
                      : darkenHex(group[0].hex, 1),
                  }"
                  @click="handlePaletteClick(group[0].hex)"
                >
                  <!-- 文字只有當顏色存在 Canvas 才顯示 -->
                  <template
                    v-if="colorsInCanvas.has(toHexFromPalette(group[0].hex))"
                  >
                    {{ group[0].group }}-{{ group[0].subIndex }}
                  </template>
                </div>
              </div>

              <!-- 延伸色 -->
              <div class="palette-sub" v-if="group.length > 1">
                <div
                  v-for="color in group.slice(1)"
                  :key="color.hex"
                  class="palette-block"
                  :class="{
                    highlighted:
                      normalizeHex(color.hex) ===
                        normalizeHex(highlightedHex) && !selectedHex,
                    selected:
                      normalizeHex(color.hex) === normalizeHex(selectedHex),
                  }"
                  :style="{
                    background: colorsInCanvas.has(color.hex.toLowerCase())
                      ? color.hex
                      : darkenHex(color.hex, 1),
                  }"
                  @click="handlePaletteClick(color.hex)"
                >
                  <!-- 文字只有當顏色存在 Canvas 才顯示 -->
                  <template v-if="colorsInCanvas.has(color.hex.toLowerCase())">
                    {{ color.group }}-{{ color.subIndex }}
                  </template>
                </div>
              </div>
            </div>
          </div>
          <!-- 色塊說明 -->
          <div class="description">
            <p>
              {{ t("Description") }}
            </p>
            <p>
              {{ t("Notice") }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed, onUnmounted } from "vue";
import { CloseBold, ZoomIn, ZoomOut } from "@element-plus/icons-vue";
import { t } from "../store/i18n";
import { GAME_PALETTE } from "../constants/gamePalette";

// Props
const props = defineProps<{
  sourceCanvas: HTMLCanvasElement | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

// References
const previewCanvas = ref<HTMLCanvasElement | null>(null); // Canvas 元素
const tooltipVisible = ref(false); // Tooltip 是否顯示
const highlightedHex = ref(""); // 高亮的右側色塊 hex
const selectedHex = ref(""); // 真正被點擊選取的顏色

// Zoom / 拖曳狀態
const zoom = ref(1);
// const MIN_ZOOM = 1;
// const MAX_ZOOM = 3;
const offset = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
let dragStart = { x: 0, y: 0 };

// 滑鼠位置
const mouseX = ref(0);
const mouseY = ref(0);

function close() {
  document.body.style.overflow = "";
  emit("close");
}

// 當前顏色資訊
const currentColor = reactive({
  hex: "",
  rgb: "",
  x: 0,
  y: 0,
});

function normalizeHex(hex: string) {
  return hex.trim().toLowerCase();
}

// 虛擬 tooltip 位置，跟隨滑鼠
const virtualRef = reactive({
  getBoundingClientRect: () => ({
    width: 0,
    height: 0,
    top: mouseY.value,
    left: mouseX.value,
    right: mouseX.value,
    bottom: mouseY.value,
  }),
});

// 右側色塊點擊
function handlePaletteClick(hex: string) {
  // 點相同顏色 = 取消
  if (selectedHex.value.toLowerCase() === hex.toLowerCase()) {
    selectedHex.value = "";
  } else {
    selectedHex.value = hex;
  }

  drawPreview(); // 重新繪製
}

// 統一 HEX 格式
function toHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

// 1 用於記錄 Canvas 出現過的顏色
const colorsInCanvas = ref<Set<string>>(new Set());

function updateColorsInCanvas() {
  if (!previewCanvas.value) return;
  const ctx = previewCanvas.value.getContext("2d");
  if (!ctx) return;

  const { width, height } = previewCanvas.value;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const colorSet = new Set<string>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const hex = toHex(r, g, b);
    colorSet.add(hex);
  }

  colorsInCanvas.value = colorSet;
}

// 2 顏色加深函數
function darkenHex(hex: string, amount = 0.8) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.floor(r * (1 - amount));
  g = Math.floor(g * (1 - amount));
  b = Math.floor(b * (1 - amount));

  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function toHexFromPalette(hex: string) {
  let h = hex.replace("#", "").toLowerCase();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return "#" + h;
}

// Canvas 繪製
function drawPreview() {
  if (!props.sourceCanvas || !previewCanvas.value) return;

  const ctx = previewCanvas.value.getContext("2d", {
    willReadFrequently: true,
  })!;
  const PREVIEW_WIDTH = previewCanvas.value.width;
  const PREVIEW_HEIGHT = previewCanvas.value.height;

  const srcW = props.sourceCanvas.width;
  const srcH = props.sourceCanvas.height;

  const scale = Math.min(PREVIEW_WIDTH / srcW, PREVIEW_HEIGHT / srcH);
  const drawW = Math.round(srcW * scale * zoom.value);
  const drawH = Math.round(srcH * scale * zoom.value);

  // 居中 + offset
  const offsetX = Math.round((PREVIEW_WIDTH - drawW) / 2 + offset.x);
  const offsetY = Math.round((PREVIEW_HEIGHT - drawH) / 2 + offset.y);

  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    props.sourceCanvas,
    0,
    0,
    srcW,
    srcH,
    offsetX,
    offsetY,
    drawW,
    drawH,
  );
  // 統計 Canvas 中的顏色
  updateColorsInCanvas();

  // 先畫圖
  ctx.drawImage(
    props.sourceCanvas,
    0,
    0,
    srcW,
    srcH,
    offsetX,
    offsetY,
    drawW,
    drawH,
  );

  // 如果沒有選取顏色 → 不處理
  if (!selectedHex.value) return;

  const imageData = ctx.getImageData(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  const data = imageData.data;

  const target = selectedHex.value.toLowerCase();
  const targetPixels: number[] = []; // 儲存符合顏色的像素 index

  // === 第一階段：暗化 + 記錄目標像素 ===
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const hex =
      "#" +
      ((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)
        .toLowerCase();

    if (hex !== target) {
      // 非目標色 → 暗化
      data[i] = r * 0.3;
      data[i + 1] = g * 0.3;
      data[i + 2] = b * 0.3;
    } else {
      // 記錄該像素位置
      targetPixels.push(i);
    }
  }

  // === 第二階段：幫目標色加描邊 ===
  const outlineColor = { r: 255, g: 255, b: 255 }; // 白色描邊

  for (const i of targetPixels) {
    const pixelIndex = i / 4;
    const x = pixelIndex % PREVIEW_WIDTH;
    const y = Math.floor(pixelIndex / PREVIEW_WIDTH);

    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const n of neighbors) {
      if (n.x >= 0 && n.y >= 0 && n.x < PREVIEW_WIDTH && n.y < PREVIEW_HEIGHT) {
        const ni = (n.y * PREVIEW_WIDTH + n.x) * 4;

        // 如果鄰居不是目標色，才畫描邊
        const nr = data[ni]!;
        const ng = data[ni + 1]!;
        const nb = data[ni + 2]!;

        const neighborHex =
          "#" +
          ((1 << 24) + (nr << 16) + (ng << 8) + nb)
            .toString(16)
            .slice(1)
            .toLowerCase();

        if (neighborHex !== target) {
          data[ni] = outlineColor.r;
          data[ni + 1] = outlineColor.g;
          data[ni + 2] = outlineColor.b;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// 調整 offset 保持邊界
function adjustOffset() {
  if (!previewCanvas.value || !props.sourceCanvas) return;

  const PREVIEW_WIDTH = previewCanvas.value.width;
  const PREVIEW_HEIGHT = previewCanvas.value.height;
  const srcW = props.sourceCanvas.width;
  const srcH = props.sourceCanvas.height;
  const scale = Math.min(PREVIEW_WIDTH / srcW, PREVIEW_HEIGHT / srcH);

  const drawW = srcW * scale * zoom.value;
  const drawH = srcH * scale * zoom.value;

  const maxOffsetX = Math.max(0, (drawW - PREVIEW_WIDTH) / 2);
  const minOffsetX = -maxOffsetX;
  const maxOffsetY = Math.max(0, (drawH - PREVIEW_HEIGHT) / 2);
  const minOffsetY = -maxOffsetY;

  offset.x = Math.min(maxOffsetX, Math.max(minOffsetX, offset.x));
  offset.y = Math.min(maxOffsetY, Math.max(minOffsetY, offset.y));
}

const zoomLevels = [1, 2, 3];
let zoomIndex = ref(0);

// Zoom
function zoomIn() {
  zoomIndex.value = Math.min(zoomIndex.value + 1, zoomLevels.length - 1);
  zoom.value = zoomLevels[zoomIndex.value]!;
  adjustOffset();
  drawPreview();
}

function zoomOut() {
  zoomIndex.value = Math.max(zoomIndex.value - 1, 0);
  zoom.value = zoomLevels[zoomIndex.value]!;
  adjustOffset();
  drawPreview();
}
// 拖曳
function handleMouseDown(e: MouseEvent) {
  isDragging.value = true;
  dragStart = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  tooltipVisible.value = false;
}

function handleMouseMoveDrag(e: MouseEvent) {
  if (!isDragging.value) return;

  offset.x = e.clientX - dragStart.x;
  offset.y = e.clientY - dragStart.y;

  adjustOffset();
  drawPreview();
}

function handleMouseUp() {
  isDragging.value = false;
}

/**
 * 當滑鼠移動在 canvas 上時
 * 1. 計算滑鼠在 canvas 上的座標
 * 2. 讀取像素 RGB
 * 3. 更新 tooltip 顯示的顏色資訊
 * 4. 更新右側色塊高亮 (highlightedHex)
 */
function handleMouseMove(e: MouseEvent) {
  const canvas = previewCanvas.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  // 將滑鼠座標轉成 canvas 真實像素座標
  const scaleX = canvas.width / rect.width; // 實際畫布寬 / CSS 寬
  const scaleY = canvas.height / rect.height; // 實際畫布高 / CSS 高

  const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
  const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

  if (
    canvasX < 0 ||
    canvasY < 0 ||
    canvasX >= canvas.width ||
    canvasY >= canvas.height
  )
    return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pixelData = ctx.getImageData(canvasX, canvasY, 1, 1).data;

  const r = pixelData[0] ?? 0;
  const g = pixelData[1] ?? 0;
  const b = pixelData[2] ?? 0;
  const a = pixelData[3] ?? 0; // alpha 通道

  // 如果 alpha=0 或者 RGB=0 都視為無色
  if (a === 0 || (r === 0 && g === 0 && b === 0)) {
    tooltipVisible.value = false;
    return;
  }

  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;

  currentColor.hex = hex;
  currentColor.rgb = `${r}, ${g}, ${b}`;
  highlightedHex.value = hex;

  mouseX.value = e.clientX;
  mouseY.value = e.clientY;
  tooltipVisible.value = true;
}

// 隱藏 tooltip 並清除高亮
function hideTooltip() {
  tooltipVisible.value = false;
  highlightedHex.value = "";
}

/**
 * 將 GAME_PALETTE 按 group 分組
 * 方便右側 palette-panel 顯示主色及延伸色
 */
const groupedPalette = computed(() => {
  const map = new Map<number, (typeof GAME_PALETTE)[number][]>();
  GAME_PALETTE.forEach((color) => {
    if (!map.has(color.group)) map.set(color.group, []);
    map.get(color.group)!.push(color);
  });
  return Array.from(map.values());
});

// 取得 palette index
function getPaletteIndex(hex: string) {
  const c = GAME_PALETTE.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  return c ? `${c.group}-${c.subIndex}` : "-";
}

onMounted(() => {
  document.body.style.overflow = "hidden";
  if (!props.sourceCanvas || !previewCanvas.value) return;

  // 設定 Canvas 大小
  previewCanvas.value.width = 800;
  previewCanvas.value.height = 800;

  const ctx = previewCanvas.value.getContext("2d", {
    willReadFrequently: true,
  })!;
  const PREVIEW_WIDTH = previewCanvas.value.width;
  const PREVIEW_HEIGHT = previewCanvas.value.height;

  const srcW = props.sourceCanvas.width;
  const srcH = props.sourceCanvas.height;

  // 計算縮放比例並居中
  const scale = Math.min(PREVIEW_WIDTH / srcW, PREVIEW_HEIGHT / srcH);
  const drawW = srcW * scale * zoom.value;
  const drawH = srcH * scale * zoom.value;
  const offsetX = (PREVIEW_WIDTH - drawW) / 2 + offset.x;
  const offsetY = (PREVIEW_HEIGHT - drawH) / 2 + offset.y;

  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    props.sourceCanvas,
    0,
    0,
    srcW,
    srcH,
    offsetX,
    offsetY,
    drawW,
    drawH,
  );

  drawPreview(); // 初始繪製
  updateColorsInCanvas(); // 統計 Canvas 顏色
});

onUnmounted(() => {
  document.body.style.overflow = ""; // 確保卸載也恢復
});
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  color: white;
  font-size: 22px;
  background: rgba(0, 0, 0, 0.6);
}

.el-icon {
  cursor: pointer;
}

.el-icon:hover {
  color: var(--primary-color);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  overflow: auto;
}

.preview-wrapper {
  position: relative;
  overflow: hidden;
  /* 防止拖曳超出邊界 */
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.zoom-controls .el-icon {
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-controls .el-icon:hover {
  background: #39c5bb;
}

.tooltip-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-block {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
}

.colorMain {
  display: flex;
  flex-direction: column;
  width: 40%;
}

.description {
  display: flex;
  padding: 16px 32px;
  flex-wrap: wrap;
}

.description p {
  font-size: 16px;
  color: var(--bg-main);
}

.palette-panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 6px;
  max-height: 75vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
  border-radius: 16px;
  scrollbar-color: #eee transparent;
  margin-left: 20px;
}

.palette-block {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: white;
  font-size: 10px;
  font-weight: bold;
  text-shadow: 0 0 2px #000;
  border: 1px solid #333;
  cursor: pointer;
}

.palette-block:hover {
  outline: 2px solid var(--primary-color);
}

.palette-block.selected {
  outline: 2px solid #ffea00;
  transform: scale(1.15);
  z-index: 3;
}

/* 高亮邊框顏色 */
.palette-block.highlighted {
  outline: 2px solid #ffea00;
  transform: scale(1.1);
  transition: all 0.15s;
  z-index: 2;
}

.palette-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.palette-main {
  margin-bottom: 2px;
}

.palette-sub {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

canvas {
  max-width: 95vw;
  max-height: 90vh;
  image-rendering: pixelated;
}

/* RWD */
@media (max-width: 1199px) {
  .content {
    flex-direction: column;
    /* 上下排列 */
    align-items: center;
    gap: 16px;
    padding: 12px;
  }

  .colorMain {
    width: 100%;
    margin-top: 12px;
  }

  .palette-panel {
    max-height: 35vh;
    margin-left: 0;
    gap: 4px;
  }

  .palette-block {
    width: 36px;
    height: 36px;
    font-size: 9px;
  }

  canvas {
    width: 100%;
    height: auto;
    max-height: 55vh;
  }

  .top-bar {
    font-size: 18px;
    height: 50px;
    padding: 0 16px;
  }

  .description {
    padding: 12px;
  }

  .description p {
    font-size: 14px;
  }

  .tooltip-content {
    gap: 6px;
    font-size: 12px;
  }

  .color-block {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 767px) {
  /* 內容改垂直排列 */
  .content {
    flex-direction: column;
    align-items: center;
    padding: 12px;
  }

  /* Canvas 滿版 */
  canvas {
    width: 100%;
    height: auto;
    max-height: 60vh;
  }

  /* 右側改成 100% */
  .colorMain {
    width: 100%;
    margin-top: 12px;
  }

  /* palette 不限制 75vh */
  .palette-panel {
    max-height: 35vh;
    margin-left: 0;
    gap: 4px;
  }

  /* 色塊縮小 */
  .palette-block {
    width: 32px;
    height: 32px;
    font-size: 8px;
  }

  /* 說明縮小 */
  .description {
    padding: 12px;
  }

  .description p {
    font-size: 13px;
  }

  /* Header bar 縮小 */
  .top-bar {
    height: 48px;
    font-size: 16px;
    padding: 0 16px;
  }

  /* Tooltip 內容縮小 */
  .tooltip-content {
    gap: 6px;
    font-size: 12px;
  }

  .color-block {
    width: 16px;
    height: 16px;
  }
}
</style>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 99;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  color: white;
  font-size: 22px;
  background: rgba(0, 0, 0, 0.6);
}

.el-icon {
  cursor: pointer;
}

.el-icon:hover {
  color: var(--primary-color);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  overflow: auto;
}

.preview-wrapper {
  position: relative;
  overflow: hidden;
  /* 防止拖曳超出邊界 */
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.zoom-controls .el-icon {
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tooltip-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-block {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
}

.colorMain {
  display: flex;
  flex-direction: column;
  width: 40%;
}

.description {
  display: flex;
  padding: 16px 32px;
  flex-wrap: wrap;
}

.description p {
  font-size: 16px;
  color: var(--bg-main);
}

.palette-panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 6px;
  max-height: 75vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
  border-radius: 16px;
  scrollbar-color: #eee transparent;
  margin-left: 20px;
}

.palette-block {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: white;
  font-size: 10px;
  font-weight: bold;
  text-shadow: 0 0 2px #000;
  border: 1px solid #333;
  cursor: pointer;
}

.palette-block:hover {
  outline: 2px solid var(--primary-color);
}

.palette-block.selected {
  outline: 2px solid #ffea00;
  transform: scale(1.15);
  z-index: 3;
}

/* 高亮邊框顏色 */
.palette-block.highlighted {
  outline: 2px solid #ffea00;
  transform: scale(1.1);
  transition: all 0.15s;
  z-index: 2;
}

.palette-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.palette-main {
  margin-bottom: 2px;
}

.palette-sub {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

canvas {
  max-width: 95vw;
  max-height: 90vh;
  image-rendering: pixelated;
}

/* RWD */
@media (max-width: 1199px) {
  .content {
    flex-direction: column;
    /* 上下排列 */
    align-items: center;
    gap: 16px;
    padding: 12px;
  }

  .colorMain {
    width: 100%;
    margin-top: 12px;
  }

  .palette-panel {
    max-height: 35vh;
    margin-left: 0;
    gap: 4px;
  }

  .palette-block {
    width: 36px;
    height: 36px;
    font-size: 9px;
  }

  canvas {
    width: 100%;
    height: auto;
    max-height: 55vh;
  }

  .top-bar {
    font-size: 18px;
    height: 50px;
    padding: 0 16px;
  }

  .description {
    padding: 12px;
  }

  .description p {
    font-size: 14px;
  }

  .tooltip-content {
    gap: 6px;
    font-size: 12px;
  }

  .color-block {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 767px) {
  /* 內容改垂直排列 */
  .content {
    flex-direction: column;
    align-items: center;
    padding: 12px;
  }

  /* Canvas 滿版 */
  canvas {
    width: 100%;
    height: auto;
    max-height: 60vh;
  }

  /* 右側改成 100% */
  .colorMain {
    width: 100%;
    margin-top: 12px;
  }

  /* palette 不限制 75vh */
  .palette-panel {
    max-height: 35vh;
    margin-left: 0;
    gap: 4px;
  }

  /* 色塊縮小 */
  .palette-block {
    width: 32px;
    height: 32px;
    font-size: 8px;
  }

  /* 說明縮小 */
  .description {
    padding: 12px;
  }

  .description p {
    font-size: 13px;
  }

  /* Header bar 縮小 */
  .top-bar {
    height: 48px;
    font-size: 16px;
    padding: 0 16px;
  }

  /* Tooltip 內容縮小 */
  .tooltip-content {
    gap: 6px;
    font-size: 12px;
  }

  .color-block {
    width: 16px;
    height: 16px;
  }
}
</style>
