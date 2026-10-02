import { splitLayoutStyle } from '../SduiAnimated';

// Reanimated needs its native part in Jest. This helper is pure, so a stub module is enough
jest.mock('react-native-reanimated', () => ({ __esModule: true, default: { View: 'Animated.View' } }));

describe('splitLayoutStyle', () => {
    it('moves margins and positioning to the wrapper', () => {
        const { wrapper, inner } = splitLayoutStyle({ marginTop: 8, position: 'absolute', top: 4, padding: 12 });

        expect(wrapper).toEqual({ marginTop: 8, position: 'absolute', top: 4 });
        expect(inner).toEqual({ padding: 12 });
    });

    it('copies flex and width to both wrapper and node', () => {
        const { wrapper, inner } = splitLayoutStyle({ flex: 1, width: 120, alignItems: 'center' });

        expect(wrapper).toEqual({ flex: 1, width: 120 });
        expect(inner).toEqual({ flex: 1, width: 120, alignItems: 'center' });
    });

    it('keeps visual styles on the node only', () => {
        const { wrapper, inner } = splitLayoutStyle({ backgroundColor: 'red', borderRadius: 12 });

        expect(wrapper).toEqual({});
        expect(inner).toEqual({ backgroundColor: 'red', borderRadius: 12 });
    });

    it('does not mutate the original style', () => {
        const style = { margin: 10, padding: 5 };
        splitLayoutStyle(style);
        expect(style).toEqual({ margin: 10, padding: 5 });
    });

    it('handles a missing style', () => {
        expect(splitLayoutStyle(undefined)).toEqual({ wrapper: {}, inner: {} });
    });
});
