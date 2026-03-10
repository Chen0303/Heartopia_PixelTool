import { GAME_PALETTE } from "../constants/gamePalette";

type RGB = { r: number; g: number; b: number };

// HEX → RGB
function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// 計算顏色距離 (歐氏距離)
function getColorDistance(c1: RGB, c2: RGB) {
  return Math.sqrt(
    (c1.r - c2.r) ** 2 +
    (c1.g - c2.g) ** 2 +
    (c1.b - c2.b) ** 2
  );
}

// 預先轉 HEX→RGB
const RGB_PALETTE: RGB[] = GAME_PALETTE.map(c => hexToRgb(c.hex));
if (RGB_PALETTE.length === 0) throw new Error("Palette is empty");

export function findClosestColor(r: number, g: number, b: number): RGB {
  const target: RGB = { r, g, b };

  let closest: RGB = RGB_PALETTE[0]!;
  let minDistance = getColorDistance(target, closest);

  for (let i = 1; i < RGB_PALETTE.length; i++) {
    const distance = getColorDistance(target, RGB_PALETTE[i]!);
    if (distance < minDistance) {
      minDistance = distance;
      closest = RGB_PALETTE[i]!;
    }
  }

  return closest;
}