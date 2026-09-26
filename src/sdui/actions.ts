/**
 * @file actions.ts
 * @description Runs the `action` attached to an SDUI node when the user taps it.
 */
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { t } from 'i18next';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { apiReq } from '@/utils/utils';
import { resolveDeep, SduiScope } from './binding';

/** What the server can ask the app to do on tap */
export type SduiAction =
    | { type: 'navigate'; screen: string; params?: Record<string, any> }
    | { type: 'copy'; text: string }
    /**
     * Calls an API. The response is saved in `state[resultKey]`, so the JSON can show it
     * with `{{state.<resultKey>.*}}`. `loadingKey` is true while the request runs and
     * `errorKey` holds the error message if it fails.
     */
    | {
        type: 'api';
        method?: 'get' | 'post' | 'put' | 'delete';
        url: string;
        body?: Record<string, any>;
        resultKey?: string;
        loadingKey?: string;
        errorKey?: string;
    };

/** Everything an action needs from the screen */
export interface ActionRuntime {
    scope: SduiScope;
    navigation: NavigationProp<ParamListBase>;
    setState: (key: string, value: any) => void;
}

/**
 * Executes an action. Bindings (e.g. `{{item.route}}`) are resolved first.
 * Unknown action types are ignored with a warning, so old app versions don't crash.
 */
export const runAction = async (action: SduiAction, { scope, navigation, setState }: ActionRuntime) => {
    const resolved = resolveDeep(action, scope);

    try {
        switch (resolved.type) {
            case 'navigate':
                navigation.navigate(resolved.screen, resolved.params);
                break;

            case 'copy':
                await Clipboard.setStringAsync(String(resolved.text ?? ''));
                Alert.alert(t('COPIED'));
                break;

            case 'api': {
                const { method = 'post', url, body, resultKey, loadingKey, errorKey } = resolved;
                if (loadingKey) setState(loadingKey, true);
                if (errorKey) setState(errorKey, null);

                try {
                    const response = await apiReq(url, body ?? {}, method);
                    console.log(`SDUI api ${method.toUpperCase()} ${url} response:`, JSON.stringify(response, null, 2));
                    if (resultKey) setState(resultKey, response);
                } catch (error: any) {
                    console.log(`SDUI api ${method.toUpperCase()} ${url} failed:`, error);
                    if (errorKey) setState(errorKey, error?.message ?? t('SOMETHING_WENT_WRONG'));
                } finally {
                    if (loadingKey) setState(loadingKey, false);
                }
                break;
            }

            default:
                console.warn('SDUI: unsupported action', resolved.type);
        }
    } catch (error) {
        console.error('SDUI: action failed', resolved.type, error);
    }
};
