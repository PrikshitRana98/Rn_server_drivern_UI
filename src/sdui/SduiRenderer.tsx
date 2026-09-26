/**
 * @file SduiRenderer.tsx
 * @description Converts a server driven UI node (JSON) into native components.
 * Calls itself for `children`, so any depth of nesting works.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import ButtonComp from '@/components/ButtonComp';
import TextComp from '@/components/TextComp';
import TextInputComp from '@/components/TextInputComp';
import { useTheme } from '@/context/ThemeContext';
import useIsRTL from '@/hooks/useIsRTL';
import { Colors, commonColors } from '@/styles/colors';
import fontFamily from '@/styles/fontFamily';
import { moderateScale } from '@/styles/scaling';
import { runAction, SduiAction } from './actions';
import { isVisible, resolveDeep, SduiScope } from './binding';
import { resolveStyle } from './styleResolver';

/** One node of the UI tree sent by the server */
export interface SduiNode {
    type: string;
    props?: Record<string, any>;
    style?: Record<string, any>;
    children?: SduiNode[];
    /** What happens on tap */
    action?: SduiAction;
    /** Binding path; the node is hidden when its value is empty (prefix `!` to invert) */
    visibleIf?: string;
}

interface SduiRendererProps {
    node: SduiNode;
    /** Values for `{{...}}` bindings, e.g. `{ data: screen.data, state }` */
    scope?: SduiScope;
    /** Updates screen state (used by actions such as `api`) */
    setState?: (key: string, value: any) => void;
}

/**
 * Renders a node and, recursively, all of its children.
 * Unknown types return null so a bad payload never crashes the screen.
 *
 * @example
 * <SduiRenderer node={profileScreen.root} scope={{ data: profileScreen.data, state }} setState={setStateValue} />
 */
const SduiRenderer = ({ node, scope = {}, setState = () => { } }: SduiRendererProps) => {
    const { theme } = useTheme();
    const colors = Colors[theme];
    const isRTL = useIsRTL();
    const navigation = useNavigation();

    if (!node || !isVisible(node.visibleIf, scope)) return null;

    const props = resolveDeep(node.props ?? {}, scope);
    const style = resolveStyle(node.style, theme, isRTL);
    const onPress = node.action
        ? () => runAction(node.action as SduiAction, { scope, navigation: navigation as any, setState })
        : undefined;

    const renderChildren = (childScope: SduiScope = scope) =>
        node.children?.map((child, index) => (
            <SduiRenderer key={index} node={child} scope={childScope} setState={setState} />
        ));

    /** A View, or a Pressable when the node has an action */
    const renderBox = (boxStyle: any, content: React.ReactNode) =>
        onPress ? (
            <Pressable onPress={onPress} style={({ pressed }) => [boxStyle, pressed && styles.pressed]}>
                {content}
            </Pressable>
        ) : (
            <View style={boxStyle}>{content}</View>
        );

    switch (node.type) {
        case 'column':
            return renderBox(style, renderChildren());

        case 'row':
            // Children side by side; reversed for Arabic (RTL)
            return renderBox(
                [styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style],
                renderChildren(),
            );

        case 'card':
            return renderBox(
                [styles.card, { backgroundColor: colors.surface }, style],
                renderChildren(),
            );

        case 'text':
            return (
                <TextComp
                    isDynamic
                    text={props.text == null ? '' : String(props.text)}
                    numberOfLines={props.numberOfLines}
                    style={style}
                    onPress={onPress}
                />
            );

        case 'button':
            return (
                <ButtonComp
                    title={props.title == null ? '' : String(props.title)}
                    variant={props.variant}
                    disabled={!!props.disabled || !onPress}
                    onPress={onPress ?? (() => { })}
                    style={style}
                />
            );

        case 'input':
            // Two-way binding: shows state[bind] and writes every change back to it
            return (
                <TextInputComp
                    value={props.bind ? String(scope.state?.[props.bind] ?? '') : undefined}
                    onChangeText={text => props.bind && setState(props.bind, text)}
                    placeholder={props.placeholder}
                    keyboardType={props.keyboardType}
                    autoCapitalize={props.autoCapitalize ?? 'none'}
                    autoCorrect={false}
                    secureTextEntry={!!props.secure}
                    containerStyle={style}
                />
            );

        case 'select': {
            // Single choice chips; the chosen option's value is saved in state[bind]
            const options: { label: string; value: string }[] = Array.isArray(props.options) ? props.options : [];
            const selected = scope.state?.[props.bind];
            return (
                <View style={[styles.selectRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
                    {options.map(option => {
                        const isSelected = option.value === selected;
                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => props.bind && setState(props.bind, option.value)}
                                style={[
                                    styles.option,
                                    { backgroundColor: colors.surface, borderColor: colors.inputBorder },
                                    isSelected && styles.optionSelected,
                                ]}
                            >
                                <TextComp
                                    isDynamic
                                    text={option.label}
                                    style={[styles.optionText, isSelected && styles.optionTextSelected]}
                                />
                            </Pressable>
                        );
                    })}
                </View>
            );
        }

        case 'image':
            return renderBox(
                undefined,
                <Image
                    source={{ uri: props.uri }}
                    style={[styles.image, style]}
                    contentFit={props.contentFit ?? 'cover'}
                    transition={200}
                />,
            );

        case 'divider':
            return <View style={[styles.divider, { backgroundColor: colors.inputBorder }, style]} />;

        case 'list': {
            // Repeats the children once per item; children read `{{item.*}}` and `{{index}}`
            const items: any[] = Array.isArray(props.items) ? props.items : [];
            return (
                <View style={style}>
                    {items.map((item, index) => (
                        <React.Fragment key={item?.id ?? index}>
                            {renderChildren({ ...scope, item, index })}
                        </React.Fragment>
                    ))}
                </View>
            );
        }

        default:
            if (__DEV__) console.warn('SDUI: unknown component', node.type);
            return null;
    }
};

const styles = StyleSheet.create({
    row: {
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: moderateScale(160),
        backgroundColor: 'rgba(128,128,128,0.2)',
    },
    card: {
        borderRadius: moderateScale(12),
        padding: moderateScale(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    selectRow: {
        gap: moderateScale(8),
        flexWrap: 'wrap',
    },
    option: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: moderateScale(10),
        paddingHorizontal: moderateScale(12),
        borderRadius: moderateScale(10),
        borderWidth: 1,
    },
    optionSelected: {
        backgroundColor: commonColors.primary,
        borderColor: commonColors.primary,
    },
    optionText: {
        fontFamily: fontFamily.medium,
    },
    optionTextSelected: {
        color: commonColors.white,
    },
    pressed: {
        opacity: 0.6,
    },
});

export default SduiRenderer;
