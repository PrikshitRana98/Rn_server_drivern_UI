//import libraries
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import useRTLStyles from './styles';
import useIsRTL from '@/hooks/useIsRTL';
import WrapperContainer from '@/components/WrapperContainer';
import HeaderComp from '@/components/HeaderComp';
import profileScreen from '@/sdui/screens/profile.json';
import SduiRenderer, { SduiNode, SduiScrollProvider } from '@/sdui/SduiRenderer';

/**
 * SDUI practice screen. Render the server driven UI inside the content view.
 */
const Sdui = () => {
    const isRTL = useIsRTL();
    const styles = useRTLStyles(isRTL);
    // Screen state; actions write into it (e.g. the POST API response) and JSON reads it as {{state.*}}
    const [state, setState] = useState<Record<string, any>>(profileScreen.state ?? {});

    const setStateValue = (key: string, value: any) => {
        setState(prev => ({ ...prev, [key]: value }));
    };

    const root = profileScreen.root as SduiNode;
    const content = (
        <SduiRenderer
            node={root}
            scope={{ data: profileScreen.data, state }}
            setState={setStateValue}
        />
    );

    return (
        <WrapperContainer style={styles.container} edges={['top']}>
            <HeaderComp showBack={false} title={profileScreen.title} />
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {root.type === 'flatList' ? (
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


export default Sdui;
