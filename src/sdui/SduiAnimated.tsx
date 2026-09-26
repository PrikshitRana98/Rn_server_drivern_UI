/**
 * @file SduiAnimated.tsx
 * @description Adds server controlled animations to any SDUI node.
 * The server only sends animation names and timings; the animations themselves live here.
 */
import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
    BounceIn,
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInDown,
    FadeInUp,
    SlideInLeft,
    SlideInRight,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
    ZoomIn,
} from 'react-native-reanimated';

/** Animations the app knows. Unknown names are ignored, so old app versions never crash. */
const ENTER_ANIMATIONS = {
    fadeIn: FadeIn,
    fadeInDown: FadeInDown,
    fadeInUp: FadeInUp,
    slideInLeft: SlideInLeft,
    slideInRight: SlideInRight,
    zoomIn: ZoomIn,
    bounceIn: BounceIn,
};

export type SduiEnterAnimation = keyof typeof ENTER_ANIMATIONS;
export type SduiLoopAnimation = 'pulse' | 'blink' | 'float' | 'shake' | 'rotate';

/**
 * `animation` block of a node.
 *
 * @example
 * { "enter": "fadeInUp", "delay": 100, "duration": 400, "stagger": 120 }
 * { "loop": "pulse", "loopDuration": 1000 }
 */
export interface SduiAnimation {
    /** Played once when the node appears */
    enter?: SduiEnterAnimation;
    /** Wait before the enter animation starts (ms) */
    delay?: number;
    /** Length of the enter animation (ms) */
    duration?: number;
    /** Inside a `list`: extra delay per item (ms), so items appear one after another */
    stagger?: number;
    /** Use a spring (bouncy) curve for the enter animation */
    spring?: boolean;
    /** Plays forever while the node is on screen */
    loop?: SduiLoopAnimation;
    /** Length of one loop cycle (ms) */
    loopDuration?: number;
}

/** Keys that decide where the node sits in its parent; they must live on the wrapper */
const MOVED_TO_WRAPPER = [
    'margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom', 'marginStart', 'marginEnd',
    'position', 'top', 'bottom', 'left', 'right', 'zIndex',
];
/** Keys needed on both the wrapper (size in parent) and the node (its own size) */
const COPIED_TO_WRAPPER = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width'];

/**
 * Splits a node style so the animated wrapper takes over the node's place in the layout.
 */
export const splitLayoutStyle = (style: Record<string, any> | undefined) => {
    const wrapper: Record<string, any> = {};
    const inner: Record<string, any> = { ...style };
    MOVED_TO_WRAPPER.forEach(key => {
        if (inner[key] !== undefined) {
            wrapper[key] = inner[key];
            delete inner[key];
        }
    });
    COPIED_TO_WRAPPER.forEach(key => {
        if (inner[key] !== undefined) wrapper[key] = inner[key];
    });
    return { wrapper, inner };
};

/** Builds the Reanimated entering animation, or undefined for an unknown name */
const buildEntering = (animation: SduiAnimation, index: number) => {
    const Enter = animation.enter ? ENTER_ANIMATIONS[animation.enter] : undefined;
    if (!Enter) return undefined;

    const delay = (animation.delay ?? 0) + index * (animation.stagger ?? 0);
    let builder: any = Enter.duration(animation.duration ?? 400).delay(delay);
    if (animation.spring) builder = builder.springify();
    return builder;
};

interface SduiAnimatedProps {
    animation: SduiAnimation;
    /** Position inside a list, used for `stagger` */
    index?: number;
    style?: Record<string, any>;
    children: React.ReactNode;
}

/**
 * Wraps a node in an Animated.View that plays its enter and loop animations.
 * Does nothing when the user has turned on "Reduce Motion" on the device.
 */
const SduiAnimated = ({ animation, index = 0, style, children }: SduiAnimatedProps) => {
    const reduceMotion = useReducedMotion();
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotate = useSharedValue(0);

    const { loop, loopDuration = 1000 } = animation;

    useEffect(() => {
        if (reduceMotion || !loop) return;
        const half = loopDuration / 2;

        switch (loop) {
            case 'pulse':
                scale.value = withRepeat(withSequence(withTiming(1.08, { duration: half }), withTiming(1, { duration: half })), -1);
                break;
            case 'blink':
                opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: half }), withTiming(1, { duration: half })), -1);
                break;
            case 'float':
                translateY.value = withRepeat(withSequence(withTiming(-6, { duration: half }), withTiming(0, { duration: half })), -1);
                break;
            case 'shake':
                // A quick shake, then a pause, repeated
                translateX.value = withRepeat(
                    withSequence(
                        withTiming(-6, { duration: 60 }),
                        withTiming(6, { duration: 60 }),
                        withTiming(-6, { duration: 60 }),
                        withTiming(0, { duration: 60 }),
                        withDelay(loopDuration, withTiming(0, { duration: 0 })),
                    ),
                    -1,
                );
                break;
            case 'rotate':
                rotate.value = withRepeat(withTiming(360, { duration: loopDuration, easing: Easing.linear }), -1);
                break;
        }

        return () => {
            [scale, opacity, translateX, translateY, rotate].forEach(value => cancelAnimation(value));
        };
    }, [loop, loopDuration, reduceMotion]);

    const loopStyle = useAnimatedStyle((): ViewStyle => ({
        opacity: opacity.value,
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotate.value}deg` },
        ],
    }));

    return (
        <Animated.View entering={reduceMotion ? undefined : buildEntering(animation, index)} style={[style, loopStyle]}>
            {children}
        </Animated.View>
    );
};

export default SduiAnimated;
