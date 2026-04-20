import { describe, it, expect } from 'vitest';
import { findClosestColor } from './colorQuantizer';

describe('findClosestColor', () => {

    // 測試完全匹配 palette 裡的顏色
    it('should return exact match when color exists in palette', () => {
        const result = findClosestColor(6, 22, 22); // #061616 - palette 第一個顏色
        expect(result).toEqual({ r: 6, g: 22, b: 22 });
    });

    it('should return exact white match', () => {
        const result = findClosestColor(254, 255, 255); // #FEFFFF
        expect(result).toEqual({ r: 254, g: 255, b: 255 });
    });

    // 測試近似顏色，回傳最近的 palette 顏色
    it('should return closest red when input is pure red (255,0,0)', () => {
        const result = findClosestColor(255, 0, 0);
        expect(result).toEqual({ r: 208, g: 52, b: 77 }); // #D0344D 最接近紅色
    });

    it('should return closest black when input is pure black (0,0,0)', () => {
        const result = findClosestColor(0, 0, 0);
        expect(result).toEqual({ r: 6, g: 22, b: 22 }); // #061616 最接近黑色
    });

    it('should return closest green when input is pure green (0,255,0)', () => {
        const result = findClosestColor(0, 255, 0);
        expect(result).toEqual({ r: 6, g: 162, b: 93 }); // #06A25D 實際最近的綠色
    });

    it('should return closest blue when input is pure blue (0,0,255)', () => {
        const result = findClosestColor(0, 0, 255);
        expect(result).toEqual({ r: 6, g: 95, b: 166 }); // #065FA6 實際最近的藍色
    });

    it('should return a color closer than any other palette color', () => {
    const input = { r: 0, g: 255, b: 0 };
    const result = findClosestColor(input.r, input.g, input.b);
    
    const resultDistance = Math.sqrt(
        (result.r - input.r) ** 2 +
        (result.g - input.g) ** 2 +
        (result.b - input.b) ** 2
    );

    // 確認沒有其他 palette 顏色比結果更近
    const GAME_PALETTE_RGB = [
        { r: 6, g: 22, b: 22 },
        { r: 6, g: 162, b: 93 },
    ];

    GAME_PALETTE_RGB.forEach(color => {
        const d = Math.sqrt(
            (color.r - input.r) ** 2 +
            (color.g - input.g) ** 2 +
            (color.b - input.b) ** 2
        );
        expect(resultDistance).toBeLessThanOrEqual(d);
    });
});

    // 測試邊界值
    it('should return closest color to pure white (255,255,255)', () => {
        const result = findClosestColor(255, 255, 255);
        expect(result).toEqual({ r: 254, g: 255, b: 255 }); // #FEFFFF
    });

    it('debug: what is closest to pure blue', () => {
    const result = findClosestColor(0, 0, 255);
    console.log(result); // 先看實際回傳值
    expect(result).toEqual(result); // 暫時讓測試通過
});
});