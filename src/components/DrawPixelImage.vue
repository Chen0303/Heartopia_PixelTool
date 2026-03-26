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
          <el-radio-group v-model="selectedRatio" size="large" fill="#e89623">
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
        <template v-if="imageUrl">
          <div class="image-wrapper" ref="imageWrapperRef">
            <img :src="imageUrl" ref="imageRef" @load="onImageLoad" />
            <div
              class="crop-box"
              :style="cropBoxStyle"
              @pointerdown="startDrag"
            >
              <div class="resize-handle" @pointerdown.stop="startResize"></div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="placeholder">{{ t("placeholder") }}</div>
        </template>
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
              <el-icon>
                <Download />
              </el-icon>
            </button>
            <button
              v-if="imageElement"
              class="download-btn"
              @click="showPreview = true"
            >
              <el-icon>
                <ZoomIn />
              </el-icon>
            </button>
          </div>
        </div>
        <canvas ref="canvasRef"></canvas>
      </div>
    </div>
  </div>

  <!-- 像素預覽畫面 -->
  <PreviewModal
    v-if="showPreview"
    :sourceCanvas="canvasRef"
    @close="showPreview = false"
  />
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { UploadFilled, Download, ZoomIn } from "@element-plus/icons-vue";
import {
  CheckboxUnchecked20Filled,
  TableSimple48Regular,
} from "@vicons/fluent";
import { GridOnRound } from "@vicons/material";
import GridIcon from "../assets/img/Group3.svg";

import PreviewModal from "../components/PreviewModal.vue";
import { findClosestColor } from "../utils/colorQuantizer";
import { drawGrid } from "../utils/drawGrid";
import { t } from "../store/i18n";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageUrl = ref<string | null>(null);
const imageElement = ref<HTMLImageElement | null>(null);
const imageWrapperRef = ref<HTMLDivElement | null>(null);
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

const selectedRatio = ref<RatioKey>("16:9"); // 預設16:9
const selectedGridIndex = ref(0);
const ratioLock = ref(true); // 鎖定比例

const cropBox = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

const cropBoxStyle = computed(() => ({
  left: `${cropBox.value.x}px`,
  top: `${cropBox.value.y}px`,
  width: `${cropBox.value.width}px`,
  height: `${cropBox.value.height}px`,
}));

// 計算當前比例
const currentRatio = computed(() => {
  if (!selectedRatio.value) return null;
  const [w, h] = selectedRatio.value.split(":").map(Number);
  return w! / h!;
});

// 對應精細度 icon
const gridIcons = [
  CheckboxUnchecked20Filled,
  TableSimple48Regular,
  GridOnRound,
  "svg",
];

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

// 初始化裁切框（16:9）
function initCropBox() {
  if (!imageWrapperRef.value || !currentRatio.value) return;

  const wrapper = imageWrapperRef.value.getBoundingClientRect();
  const ratio = currentRatio.value;

  let width = wrapper.width * 0.6;
  let height = width / ratio;

  if (height > wrapper.height * 0.6) {
    height = wrapper.height * 0.6;
    width = height * ratio;
  }

  cropBox.value.width = width;
  cropBox.value.height = height;
  cropBox.value.x = (wrapper.width - width) / 2;
  cropBox.value.y = 0;
}

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

// 取得像素資料並量化顏色
function quantizeCanvas(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
) {
  const imageData = ctx.getImageData(0, 0, cols, rows);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const closest = findClosestColor(data[i]!, data[i + 1]!, data[i + 2]!);

    data[i] = closest.r;
    data[i + 1] = closest.g;
    data[i + 2] = closest.b;
  }

  ctx.putImageData(imageData, 0, 0);
}

function renderPixel() {
  if (!canvasRef.value || !imageElement.value || !imageWrapperRef.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d")!;

  const wrapperRect = imageWrapperRef.value.getBoundingClientRect();
  const scaleX = imageElement.value.naturalWidth / wrapperRect.width;
  const scaleY = imageElement.value.naturalHeight / wrapperRect.height;

  // 計算 cropBox 在原圖上的位置與尺寸
  const sx = cropBox.value.x * scaleX;
  const sy = cropBox.value.y * scaleY;
  const sWidth = cropBox.value.width * scaleX;
  const sHeight = cropBox.value.height * scaleY;

  // 如果裁切尺寸為0直接跳出
  if (sWidth <= 0 || sHeight <= 0) return;

  const sizes = gridOptions[selectedRatio.value];
  const grid = sizes[selectedGridIndex.value];
  if (!grid) return;

  const [cols, rows] = grid;
  const scale = 5;
  canvas.width = cols * scale;
  canvas.height = rows * scale;

  ctx.imageSmoothingEnabled = false;

  // 縮小裁切區域到 cols x rows
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCanvas.width = cols;
  tempCanvas.height = rows;

  tempCtx.drawImage(
    imageElement.value,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    cols,
    rows,
  );

  quantizeCanvas(tempCtx, cols, rows);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

  if (showGrid.value) {
    drawGrid(ctx, cols, rows, canvas.width, canvas.height, selectedRatio.value);
  }
}

let isDragging = false;
let startX = 0;
let startY = 0;

function startDrag(e: PointerEvent) {
  e.preventDefault();

  isDragging = true;

  startX = e.clientX - cropBox.value.x;
  startY = e.clientY - cropBox.value.y;

  document.body.classList.add("noselect");

  window.addEventListener("pointermove", onDrag);
  window.addEventListener("pointerup", stopDrag);
}

function onDrag(e: PointerEvent) {
  if (!isDragging || !imageWrapperRef.value) return;

  const wrapperRect = imageWrapperRef.value.getBoundingClientRect();

  let x = e.clientX - startX;
  let y = e.clientY - startY;

  // 限制邊界
  x = Math.max(0, Math.min(x, wrapperRect.width - cropBox.value.width));
  y = Math.max(0, Math.min(y, wrapperRect.height - cropBox.value.height));

  cropBox.value.x = x;
  cropBox.value.y = y;
}

function stopDrag() {
  isDragging = false;

  document.body.classList.remove("noselect");

  window.removeEventListener("pointermove", onDrag);
  window.removeEventListener("pointerup", stopDrag);

  nextTick(() => renderPixel());
}

// =========================
// 改變大小
let isResizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let startWidth = 0;
let startHeight = 0;

function startResize(e: PointerEvent) {
  e.preventDefault(); // 阻止滑鼠選取
  isResizing = true;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  startWidth = cropBox.value.width;
  startHeight = cropBox.value.height;

  document.body.classList.add("noselect");

  window.addEventListener("pointermove", onResize);
  window.addEventListener("pointerup", stopResize);
}

function onResize(e: PointerEvent) {
  if (!isResizing || !imageWrapperRef.value) return;
  const wrapper = imageWrapperRef.value.getBoundingClientRect();

  let newWidth = startWidth + (e.clientX - resizeStartX);
  let newHeight = startHeight + (e.clientY - resizeStartY);

  // 🔹 如果鎖定比例
  if (ratioLock.value && currentRatio.value) {
    const ratio = currentRatio.value;

    // 根據哪個方向改變比較大來決定另一個
    if (Math.abs(newWidth - startWidth) > Math.abs(newHeight - startHeight)) {
      newHeight = newWidth / ratio;
    } else {
      newWidth = newHeight * ratio;
    }
  }

  // 限制不超過圖片邊界
  newWidth = Math.min(newWidth, wrapper.width - cropBox.value.x);
  newHeight = Math.min(newHeight, wrapper.height - cropBox.value.y);

  cropBox.value.width = Math.max(20, newWidth);
  cropBox.value.height = Math.max(20, newHeight);
}

function stopResize() {
  isResizing = false;
  window.removeEventListener("pointermove", onResize);
  window.removeEventListener("pointerup", stopResize);

  // 裁切完成後更新像素圖
  nextTick(() => renderPixel());
}

function downloadImage() {
  if (!imageElement.value || !imageWrapperRef.value) return;

  const sizes = gridOptions[selectedRatio.value];
  const grid = sizes[selectedGridIndex.value];
  if (!grid) return;

  const [cols, rows] = grid;
  const scale = 5; // 和 renderPixel 一樣
  const width = cols * scale;
  const height = rows * scale;

  const wrapperRect = imageWrapperRef.value.getBoundingClientRect();
  const scaleX = imageElement.value.naturalWidth / wrapperRect.width;
  const scaleY = imageElement.value.naturalHeight / wrapperRect.height;

  // 計算 cropBox 在原圖上的位置與尺寸
  const sx = cropBox.value.x * scaleX;
  const sy = cropBox.value.y * scaleY;
  const sWidth = cropBox.value.width * scaleX;
  const sHeight = cropBox.value.height * scaleY;

  if (sWidth <= 0 || sHeight <= 0) return;

  // 建立下載用 canvas
  const exportCanvas = document.createElement("canvas");
  const ctx = exportCanvas.getContext("2d")!;
  exportCanvas.width = width;
  exportCanvas.height = height;
  ctx.imageSmoothingEnabled = false;

  // 將裁切區域縮小到 cols x rows
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCanvas.width = cols;
  tempCanvas.height = rows;

  tempCtx.drawImage(
    imageElement.value,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    cols,
    rows,
  );

  // 顏色量化
  quantizeCanvas(tempCtx, cols, rows);

  // 放大到下載大小
  ctx.drawImage(tempCanvas, 0, 0, width, height);

  // 可選格線
  if (showGrid.value) {
    drawGrid(ctx, cols, rows, width, height, selectedRatio.value);
  }

  // 下載
  const link = document.createElement("a");
  link.download = "pixel-image.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

// 監聽選擇比例，重設裁切框
watch(selectedRatio, (newVal) => {
  if (!imageWrapperRef.value) return;

  const wrapper = imageWrapperRef.value.getBoundingClientRect();
  if (!newVal) return;

  ratioLock.value = true; // 鎖定比例

  const ratio = currentRatio.value!;
  let width = wrapper.width * 0.6; // 佔60%寬度
  let height = width / ratio;

  // 高度超過可用高度 → 用高度限制
  if (height > wrapper.height * 0.6) {
    height = wrapper.height * 0.6;
    width = height * ratio;
  }

  // 最小尺寸限制
  const minWidth = 80;
  const minHeight = minWidth / ratio;
  width = Math.max(width, minWidth);
  height = Math.max(height, minHeight);

  // 置中
  cropBox.value.width = width;
  cropBox.value.height = height;
  cropBox.value.x = (wrapper.width - width) / 2;
  cropBox.value.y = (wrapper.height - height) / 2;

  nextTick(() => renderPixel());
});

// 監聽比例切換，重置裁切框
watch(selectedRatio, () => {
  nextTick(() => initCropBox());
});

// 圖片載入完成後初始化裁切框
function onImageLoad() {
  nextTick(() => {
    initCropBox(); // 初始化裁切框 16:9
    renderPixel(); // 預設渲染像素圖
  });
}

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
  align-items: center;
  gap: 16px;
  margin-right: 32px;
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

  background: var(--card-bg);
  border: 2px solid #ececf2;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 18px 25px rgba(202, 202, 202, 0.103);
}

.card p {
  font-weight: 600;
}

.image-wrapper {
  position: relative;
  display: inline-block;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  /* 高度也填滿 */
  object-fit: contain;
  /* 或 cover 視需求 */
}

.crop-box {
  position: absolute;
  border: 2px dashed #39c5bb;
  background: rgba(57, 197, 187, 0.2);
  cursor: move;
  width: 100px;
  height: 100px;
  top: 50px;
  left: 50px;
  touch-action: none;
}

.resize-handle {
  position: absolute;
  width: 0;
  height: 0;
  bottom: 0;
  right: 0;
  border-left: 12px solid transparent;
  border-bottom: 12px solid #39c5bb;
  cursor: se-resize;
}

.card img {
  max-width: 100%;
}

.card canvas {
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

.noselect {
  user-select: none;
  /* 標準 */
  -webkit-user-select: none;
  /* Safari / Chrome */
  -moz-user-select: none;
  /* Firefox */
  -ms-user-select: none;
  /* IE/Edge */
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
