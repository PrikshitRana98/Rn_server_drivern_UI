/**
 * @file styleResolver.ts
 * @description Converts a style from SDUI JSON into a React Native style that follows
 * the app's theme, fonts, scaling and RTL rules.
 */
import { Colors, commonColors, ThemeType } from '@/styles/colors';
import fontFamily from '@/styles/fontFamily';
import { moderateScale } from '@/styles/scaling';

/** Numeric values of these keys are scaled for the device size */
const SCALED_KEYS = new Set([
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'padding', 'paddingHorizontal', 'paddingVertical', 'paddingTop', 'paddingBottom',
    'margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom',
    'fontSize', 'lineHeight', 'borderRadius', 'gap', 'rowGap', 'columnGap',
]);

/**
 * `"$primary"` -> theme color, then common color. Anything else is returned untouched.
 */
const resolveColor = (value: any, theme: ThemeType) => {
    if (typeof value !== 'string' || !value.startsWith('$')) return value;
    const token = value.slice(1);
    return (Colors[theme] as Record<string, string>)[token]
        ?? (commonColors as Record<string, string>)[token]
        ?? value;
};

/**
 * Builds a React Native style from a JSON style.
 * - `"$token"` values use the current theme (so dark mode works)
 * - `"font": "bold"` maps to the app font family (`regular | medium | semiBold | bold`)
 * - numbers for sizes are scaled with `moderateScale`
 * - `flexDirection: "row"` flips for RTL languages
 *
 * @example
 * resolveStyle({ color: '$primary', font: 'bold', fontSize: 18 }, 'dark', false)
 */
export const resolveStyle = (style: Record<string, any> | undefined, theme: ThemeType, isRTL: boolean) => {
    if (!style) return undefined;
    const result: Record<string, any> = {};

    Object.keys(style).forEach(key => {
        const value = resolveColor(style[key], theme);

        if (key === 'font') {
            result.fontFamily = (fontFamily as Record<string, string>)[value] ?? fontFamily.regular;
        } else if (SCALED_KEYS.has(key) && typeof value === 'number') {
            result[key] = moderateScale(value);
        } else if (key === 'flexDirection' && isRTL && value === 'row') {
            result[key] = 'row-reverse';
        } else {
            result[key] = value;
        }
    });

    return result;
};
