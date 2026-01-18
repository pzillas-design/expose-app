/**
 * Aspect Ratio utilities for Imagen 3
 * Supported ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
 */

const VALID_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];

const parseRatio = (s: string): number => {
    const [w, h] = s.split(':').map(Number);
    return w / h;
};

/**
 * Finds the closest valid aspect ratio to the target ratio string
 */
export const findClosestValidRatio = (targetRatioStr: string): string => {
    if (VALID_RATIOS.includes(targetRatioStr)) return targetRatioStr;

    const targetVal = parseRatio(targetRatioStr);
    if (isNaN(targetVal)) return '1:1';

    let bestMatch = '1:1';
    let minDiff = Number.MAX_VALUE;

    for (const r of VALID_RATIOS) {
        const val = parseRatio(r);
        const diff = Math.abs(val - targetVal);
        if (diff < minDiff) {
            minDiff = diff;
            bestMatch = r;
        }
    }
    return bestMatch;
};

/**
 * Gets the closest valid aspect ratio from image dimensions
 */
export const getClosestAspectRatioFromDims = (width: number, height: number): string => {
    const val = width / height;
    const ratioMap = VALID_RATIOS.map(r => {
        const [w, h] = r.split(':').map(Number);
        return { str: r, val: w / h };
    });

    return ratioMap.reduce((prev, curr) =>
        Math.abs(curr.val - val) < Math.abs(prev.val - val) ? curr : prev
    ).str;
};
