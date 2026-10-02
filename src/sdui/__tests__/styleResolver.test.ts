import { Colors, commonColors } from '@/styles/colors';
import fontFamily from '@/styles/fontFamily';
import { moderateScale } from '@/styles/scaling';
import { resolveStyle } from '../styleResolver';

describe('resolveStyle', () => {
    it('returns undefined when there is no style', () => {
        expect(resolveStyle(undefined, 'light', false)).toBeUndefined();
    });

    it('maps $tokens to the current theme colors', () => {
        expect(resolveStyle({ color: '$text' }, 'light', false)).toEqual({ color: Colors.light.text });
        expect(resolveStyle({ color: '$text' }, 'dark', false)).toEqual({ color: Colors.dark.text });
    });

    it('falls back to common colors for tokens not in the theme', () => {
        expect(resolveStyle({ backgroundColor: '$secondary' }, 'light', false))
            .toEqual({ backgroundColor: commonColors.secondary });
    });

    it('leaves unknown tokens and plain colors untouched', () => {
        expect(resolveStyle({ color: '$doesNotExist', borderColor: '#FF0000' }, 'light', false))
            .toEqual({ color: '$doesNotExist', borderColor: '#FF0000' });
    });

    it('maps font names to the app font family', () => {
        expect(resolveStyle({ font: 'bold' }, 'light', false)).toEqual({ fontFamily: fontFamily.bold });
        expect(resolveStyle({ font: 'semiBold' }, 'light', false)).toEqual({ fontFamily: fontFamily.semiBold });
    });

    it('uses the regular font for an unknown font name', () => {
        expect(resolveStyle({ font: 'comicSans' }, 'light', false)).toEqual({ fontFamily: fontFamily.regular });
    });

    it('scales numeric sizes', () => {
        expect(resolveStyle({ padding: 16, fontSize: 14, borderRadius: 8 }, 'light', false)).toEqual({
            padding: moderateScale(16),
            fontSize: moderateScale(14),
            borderRadius: moderateScale(8),
        });
    });

    it('does not scale percentages or unitless values', () => {
        expect(resolveStyle({ width: '100%', flex: 1, opacity: 0.5 }, 'light', false))
            .toEqual({ width: '100%', flex: 1, opacity: 0.5 });
    });

    it('flips row direction only for RTL', () => {
        expect(resolveStyle({ flexDirection: 'row' }, 'light', true)).toEqual({ flexDirection: 'row-reverse' });
        expect(resolveStyle({ flexDirection: 'row' }, 'light', false)).toEqual({ flexDirection: 'row' });
        expect(resolveStyle({ flexDirection: 'column' }, 'light', true)).toEqual({ flexDirection: 'column' });
    });

    it('passes other keys through', () => {
        const style = { textDecorationLine: 'line-through', letterSpacing: 1.5, borderStyle: 'dashed' };
        expect(resolveStyle(style, 'light', false)).toEqual(style);
    });
});
