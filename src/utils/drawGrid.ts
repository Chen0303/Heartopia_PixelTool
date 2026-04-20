export type RatioKey = "1:1" | "16:9" | "9:16" | "3:4" | "4:3";

/**
 * 繪製網格線
 * @param ctx CanvasRenderingContext2D
 * @param cols 水平格數
 * @param rows 垂直格數
 * @param width Canvas 寬
 * @param height Canvas 高
 * @param ratio 畫布比例 (16:9 才反轉計算)
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  width: number,
  height: number,
  ratio?: RatioKey | "custom"
) {
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  // 垂直線
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    if (x % 5 === 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.3;
    }
    if (x === 0 || x === cols) {
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 1.7;
    }
    ctx.moveTo(x * cellWidth + 0.5, 0);
    ctx.lineTo(x * cellWidth + 0.5, height);
    ctx.stroke();
  }

  // 水平線
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    let majorLine: boolean;

    if (ratio === "16:9") {
      const offset = rows % 5;
      majorLine = (y - offset + 5) % 5 === 0;
    } else {
      majorLine = y % 5 === 0;
    }

    if (majorLine) {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.3;
    }

    if (y === 0 || y === rows) {
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineWidth = 1.7;
    }

    ctx.moveTo(0, y * cellHeight + 0.5);
    ctx.lineTo(width, y * cellHeight + 0.5);
    ctx.stroke();
  }
}