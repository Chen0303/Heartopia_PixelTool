<template>
  <div class="main">
    <!-- 控制面板 -->
    <div class="panel">
      <!-- 上傳照片 -->
      <el-upload
        class="upload-box"
        drag
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleChange"
        accept="image/*"
      >
        <el-icon class="el-icon--upload">
          <upload-filled />
        </el-icon>
        <div class="el-upload__text">
          {{ t("uploadHint") }}<em>{{ t("UploadFile") }}</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">{{ t("uploadTip") }}</div>
        </template>
      </el-upload>

      <div class="control_wrap">
        <div class="control-item">
          <p>{{ t("canvasRatio") }}</p>
          <el-radio-group v-model="selectedRatio" size="large" fill="#8C867F">
            <el-radio-button
              v-for="r in ratios"
              :key="r.label"
              :value="r.value"
            >
              {{ r.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="control-item">
          <p>{{ t("gridPrecision") }}</p>
          <div class="grid-icons">
            <button
              v-for="(_, index) in gridOptions[selectedRatio]"
              :key="index"
              circle
              @click="selectedGridIndex = index"
              class="gridBtn"
              :class="{ active: selectedGridIndex === index }"
            >
              <el-icon v-if="gridIcons[index] !== 'svg'">
                <component :is="gridIcons[index]" />
              </el-icon>

              <GridIcon v-else class="icon-img" />
            </button>
          </div>
        </div>
      </div>

      <div class="switch-item">
        <p>{{ t("showGrid") }}</p>
        <el-switch
          v-model="showGrid"
          :active-text="t('Open')"
          :inactive-text="t('Close')"
          active-color="#000"
          inactive-color="#000"
        />
      </div>
    </div>

    <!-- 顯示區域 -->
    <div class="display">
      <div class="card">
        <p>{{ t("originalImage") }}</p>
        <img v-if="imageUrl" :src="imageUrl" />
        <div v-else class="placeholder">{{ t("placeholder") }}</div>
      </div>

      <div class="card">
        <div class="pixel_down">
          <p>{{ t("pixelImage") }}</p>
          <div class="btnWarp">
            <button
              v-if="imageElement"
              class="download-btn"
              @click="downloadImage"
            >
              <el-icon><Download /></el-icon>
            </button>
            <button
              v-if="imageElement"
              class="download-btn"
              @click="showPreview = true"
            >
              <el-icon><ZoomIn /></el-icon>
            </button>
          </div>
        </div>
        <canvas ref="canvasRef"></canvas>
      </div>
    </div>
  </div>

  <PreviewModal
    v-if="showPreview"
    :sourceCanvas="canvasRef"
    @close="showPreview = false"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { UploadFilled, Download, ZoomIn } from "@element-plus/icons-vue";
import {
  CheckboxUnchecked20Filled,
  TableSimple48Regular,
} from "@vicons/fluent";
import { GridOnRound } from "@vicons/material";
import GridIcon from "../assets/img/Group3.svg";

import PreviewModal from "../components/PreviewModal.vue";
import { findClosestColor } from "../utils/colorQuantizer";
import { t } from "../store/i18n";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageUrl = ref<string | null>(null);
const imageElement = ref<HTMLImageElement | null>(null);
const showGrid = ref(true);

const showPreview = ref(false);

type GridSize = [number, number];

// 定義可選比例
type RatioKey = "1:1" | "16:9" | "9:16" | "3:4" | "4:3";

const ratios: { label: string; value: RatioKey }[] = [
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
  { label: "1:1", value: "1:1" },
  { label: "3:4", value: "3:4" },
  { label: "9:16", value: "9:16" },
];

// 對應精細度 icon
const gridIcons = [
  CheckboxUnchecked20Filled,
  TableSimple48Regular,
  GridOnRound,
  "svg",
];

const selectedRatio = ref<RatioKey>("16:9"); // 預設16:9
const selectedGridIndex = ref(0);

const gridOptions: Record<RatioKey, GridSize[]> = {
  "16:9": [
    [30, 18],
    [50, 28],
    [100, 56],
    [150, 84],
  ],
  "4:3": [
    [30, 24],
    [50, 38],
    [100, 76],
    [150, 114],
  ],
  "1:1": [
    [30, 30],
    [50, 50],
    [100, 100],
    [150, 150],
  ],
  "3:4": [
    [24, 30],
    [38, 50],
    [67, 100],
    [114, 150],
  ],
  "9:16": [
    [18, 30],
    [28, 50],
    [56, 100],
    [84, 150],
  ],
};

function handleChange(uploadFile: any) {
  const file = uploadFile.raw;

  const reader = new FileReader();

  reader.onload = () => {
    const base64 = reader.result as string;
    console.log(base64.slice(0, 50));

    imageUrl.value = base64;

    const img = new Image();
    img.src = base64;

    img.onload = () => {
      imageElement.value = img;
      renderPixel();
    };
  };

  reader.readAsDataURL(file);
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cols: number,
  rows: number,
) {
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  const imgRatio = imgWidth / imgHeight;
  const targetRatio = cols / rows;

  let sx = 0;
  let sy = 0;
  let sWidth = imgWidth;
  let sHeight = imgHeight;

  if (imgRatio > targetRatio) {
    // 圖太寬 → 裁左右
    sWidth = imgHeight * targetRatio;
    sx = (imgWidth - sWidth) / 2;
  } else {
    // 圖太高 → 裁上下
    sHeight = imgWidth / targetRatio;
    sy = (imgHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cols, rows);
}

function renderPixel() {
  if (!canvasRef.value || !imageElement.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d")!;
  const sizes = gridOptions[selectedRatio.value];
  const grid = sizes[selectedGridIndex.value];
  if (!grid) return;

  const [cols, rows] = grid;

  // 放大倍數
  const scale = 5;
  const displayWidth = cols * scale;
  const displayHeight = rows * scale;

  // 直接設置 Canvas 屬性大小，避免 CSS 放大
  canvas.width = displayWidth;
  canvas.height = displayHeight;


  // 關閉所有平滑插值
  ctx.imageSmoothingEnabled = false;
  (ctx as any).webkitImageSmoothingEnabled = false;
  (ctx as any).mozImageSmoothingEnabled = false;
  (ctx as any).msImageSmoothingEnabled = false;

  // 建立暫存 Canvas 縮小原圖到 cols x rows
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCanvas.width = cols;
  tempCanvas.height = rows;

  drawImageCover(tempCtx, imageElement.value, cols, rows);

  // 取得像素資料並量化顏色
  const imageData = tempCtx.getImageData(0, 0, cols, rows);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const closest = findClosestColor(r, g, b);

    data[i] = closest.r;
    data[i + 1] = closest.g;
    data[i + 2] = closest.b;
    // alpha 保持原樣
  }

  tempCtx.putImageData(imageData, 0, 0);

  // 放大到主 Canvas
  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);

  // 畫網格線
  if (showGrid.value) {
    drawGrid(ctx, cols, rows, displayWidth, displayHeight);
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  displayWidth: number,
  displayHeight: number,
) {
  const cellWidth = displayWidth / cols;
  const cellHeight = displayHeight / rows;

  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();

    // 每 5 格加粗
    if (x % 5 === 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.3;
    }

    // 最外框更粗
    if (x === 0 || x === cols) {
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 2;
    }

    ctx.moveTo(x * cellWidth + 0.5, 0);
    ctx.lineTo(x * cellWidth + 0.5, displayHeight);
    ctx.stroke();
  }

  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();

    if (y % 5 === 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 0.5;
    }

    if (y === 0 || y === rows) {
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 2;
    }

    ctx.moveTo(0, y * cellHeight + 0.5);
    ctx.lineTo(displayWidth, y * cellHeight + 0.5);
    ctx.stroke();
  }
}

function downloadImage() {
  if (!imageElement.value) return;

  const sizes = gridOptions[selectedRatio.value];
  const grid = sizes[selectedGridIndex.value];
  if (!grid) return;

  const [cols, rows] = grid;

  const scale = 5; // 和 renderPixel 一樣
  const width = cols * scale;
  const height = rows * scale;

  // 建立下載專用 canvas
  const exportCanvas = document.createElement("canvas");
  const ctx = exportCanvas.getContext("2d")!;
  exportCanvas.width = width;
  exportCanvas.height = height;

  ctx.imageSmoothingEnabled = false;

  // 縮小原圖
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCanvas.width = cols;
  tempCanvas.height = rows;
  drawImageCover(tempCtx, imageElement.value, cols, rows);

  // 放大
  ctx.drawImage(tempCanvas, 0, 0, width, height);

  // 判斷是否畫格線
  if (showGrid.value) {
    drawGrid(ctx, cols, rows, width, height);
  }

  // 下載
  const link = document.createElement("a");
  link.download = "pixel-image.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

watch(selectedRatio, () => {
  selectedGridIndex.value = 0;
  nextTick(() => renderPixel());
});

// 切換精細度或格線時重畫
watch([selectedGridIndex, showGrid], () => nextTick(() => renderPixel()));
</script>

<style scoped>
.main {
  width: 100%;
}

.title {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: var(--text-main);
  margin-top: 16px;
  margin-bottom: 24px;
}

/* 控制面板 */
.panel {
  display: flex;
  /* height: 40%; */
  width: 100%;
  flex-wrap: wrap;
}

/* 上傳圖片區 */
.upload-box {
  height: 30%;
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

:deep(.el-upload-dragger) {
  --el-fill-color-blank: transparent;
  background-color: transparent;
  --el-border-color: var(--text-main);
}

:deep(.el-upload-dragger .el-icon--upload) {
  --el-text-color-placeholder: var(--text-main);
}

:deep(.el-upload__text) {
  --el-text-color-regular: var(--text-main);
}

:deep(.el-upload__text em) {
  --el-color-primary: var(--danger-color);
  font-weight: 600;
  font-size: 16px;
}

:deep(.el-upload__tip) {
  --el-text-color-regular: var(--text-secondary);
}

/* 控制項目設定 */
.control_wrap {
  display: flex;
  width: 100%;
  gap: 16px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 50%;
}

.control-item p {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

/* 網格精度按鈕 */
.grid-icons {
  display: flex;
  gap: 8px;
}

.grid-icons .gridBtn {
  display: flex;
  width: 42px;
  height: 42px;
  padding: 0;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-light);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.09);
}

.grid-icons .el-icon {
  font-size: 24px;
}

.gridBtn .icon-img {
  width: 24px;
  height: 24px;
}

.gridBtn:hover .icon-img,
.gridBtn.active .icon-img {
  filter: brightness(0) invert(1);
}

.grid-icons .gridBtn:hover {
  background-color: var(--hover-bg-color);
  color: white;
  transform: scale(1.1);
}

.grid-icons .gridBtn.active {
  background-color: var(--text-main);
  color: white;
  transform: scale(1.1);
}

:deep(.el-radio-button) {
  --el-fill-color-blank: transparent;
  background-color: var(--text-main);
  --el-font-weight-primary: 600;
}

:deep(.el-radio-button__inner) {
  color: var(--bg-light);
}

/* 顯示網格線切換 */
:deep(.el-switch) {
  --el-color-primary: #5e5a54;
}

.switch-item {
  display: flex;
  margin-top: 16px;
  align-items: center;
  gap: 16px;
}

.switch-item p {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

/* 顯示圖片區域 */
.display {
  display: flex;
  flex-wrap: wrap;
  /* height: 60%; */
  width: 100%;
  gap: 40px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.card {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  /* min-height: 450px; */
  min-width: 0;
  padding: 20px;
  border-radius: 12px;
  text-align: center;

  background: var(--bg-light);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.card p {
  font-weight: 600;
}

.card img,
canvas {
  max-width: 100%;
  margin-top: 15px;
}

.card canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: -o-crisp-edges;
}


/* 像素圖片 */
.pixel_down {
  display: flex;
  width: 100%;
  flex-direction: column;
}

.pixel_down p {
  display: flex;
  width: 100%;
  font-weight: 600;
  justify-content: center;
}

.btnWarp {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.pixel-card {
  position: relative;
  background: var(--bg-light);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

/* 下載像素圖按鈕 */
.download-btn {
  display: flex;
  background-color: var(--text-main);
  width: 30px;
  height: 30px;
  color: var(--bg-light);
  padding: 0;
  align-items: center;
  justify-content: center;
}

.download-btn:hover {
  background-color: var(--text-secondary);
}

.placeholder {
  display: flex;
  height: 100%;
  color: #64748b;
  align-items: center;
  justify-content: center;
}


/* =========================
  Desktop ≥1200px
========================= */
/* @media (min-width: 1200px) {
  .panel {
    flex-direction: row;
    gap: 24px;
  }

  .control_wrap {
    width: 60%;
  }

  .upload-box {
    width: 40%;
  }

  .display {
    flex-direction: row;
  }

  .card {
    min-height: 480px;
  }
} */

/* =========================
  Tablet 768px – 1199px
========================= */
@media (max-width: 1199px) {
  .panel {
    flex-direction: column;
  }

  .control_wrap {
    flex-direction: row;
    gap: 12px;
  }

  .control-item {
    width: 50%;
  }

  .display {
    gap: 24px;
  }

  .card {
    min-width: 260px;
  }

  .grid-icons .gridBtn {
    width: 36px;
    height: 36px;
  }

  .grid-icons .el-icon {
    font-size: 20px;
  }
}

/* =========================
  Mobile ≤767px
========================= */
@media (max-width: 767px) {

  /* 控制區改單欄 */
  .control_wrap {
    flex-direction: column;
  }

  .control-item {
    width: 100%;
  }

  .panel {
    gap: 16px;
  }

  /* 顯示區改單欄 */
  .display {
    flex-direction: column;
    width: 100%;
    gap: 20px;
  }

  .card {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 18px;
  }

  .card img,
  .card canvas {
    width: 100%;
    height: auto;
    max-width: 100%;
    display: block;
  }

  /* Grid icon 縮小 */
  .grid-icons {
    flex-wrap: wrap;
  }

  .grid-icons .gridBtn {
    width: 32px;
    height: 32px;
  }

  .grid-icons .el-icon {
    font-size: 18px;
  }

  /* Radio button 不要太擠 */
  :deep(.el-radio-group) {
    flex-wrap: wrap;
  }

  :deep(.el-radio-button) {
    margin-bottom: 6px;
  }

  /* 下載按鈕縮小 */
  .download-btn {
    width: 28px;
    height: 28px;
  }

  /* 標題字體略縮 */
  .control-item p,
  .switch-item p {
    font-size: 14px;
  }
}

</style>
