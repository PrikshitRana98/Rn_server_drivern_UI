/**
 * @file SduiScreenView.tsx
 * @description Renders a full server driven screen from its JSON: header, screen state,
 * keyboard handling and scrolling. Screens only pass their JSON.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Edge } from 'react-native-safe-area-context';
import HeaderComp from '@/components/HeaderComp';
import WrapperContainer from '@/components/WrapperContainer';
import SduiRenderer, { SduiNode, SduiScrollProvider } from './SduiRenderer';

/** Top level JSON of an SDUI screen */
export interface SduiScreenSchema {
    id?: string;
    schemaVersion?: number;
    /** Header title (translation key or plain text) */
    title?: string;
    /** Hide the header with `false`. Defaults to true */
    showHeader?: boolean;
    /** Show the header back arrow. Defaults to false */
    showBack?: boolean;
    /** Initial values for `{{state.*}}`; actions and inputs write into it */
    state?: Record<string, any>;
    /** Values for `{{data.*}}` */
    data?: Record<string, any>;
    root: SduiNode;
}

interface SduiScreenViewProps {
    schema: SduiScreenSchema;
    /** Safe area edges; use `['top']` inside a tab so the tab bar handles the bottom */
    edges?: Edge[];
}

/**
 * Full screen SDUI renderer.
 *
 * @component
 * @example
 * <SduiScreenView schema={salesScreen as SduiScreenSchema} />
 */
const SduiScreenView = ({ schema, edges }: SduiScreenViewProps) => {
    const [state, setState] = useState<Record<string, any>>(schema.state ?? {});

    const setStateValue = (key: string, value: any) => {
        setState(prev => ({ ...prev, [key]: value }));
    };

    const content = (
        <SduiRenderer
            node={schema.root}
            scope={{ data: schema.data ?? {}, state }}
            setState={setStateValue}
        />
    );

    return (
        <WrapperContainer style={styles.container} edges={edges}>
            {schema.showHeader !== false && (
                <HeaderComp showBack={!!schema.showBack} title={schema.title} />
            )}
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {schema.root.type === 'flatList' ? (
                    // A list root scrolls the whole screen itself (fully virtualized)
                    content
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        // First tap on a button works even while the keyboard is open
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        <SduiScrollProvider value="vertical">{content}</SduiScrollProvider>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </WrapperContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default SduiScreenView;
