//import libraries
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import useRTLStyles from './styles';
import useIsRTL from '@/hooks/useIsRTL';
import WrapperContainer from '@/components/WrapperContainer';
import HeaderComp from '@/components/HeaderComp';
import profileScreen from '@/sdui/screens/profile.json';
import SduiRenderer, { SduiNode } from '@/sdui/SduiRenderer';

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

    return (
        <WrapperContainer style={styles.container} edges={['top']}>
            <HeaderComp showBack={false} title={profileScreen.title} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <SduiRenderer
                    node={profileScreen.root as SduiNode}
                    scope={{ data: profileScreen.data, state }}
                    setState={setStateValue}
                />
            </ScrollView>
        </WrapperContainer>
    );
};


export default Sdui;
