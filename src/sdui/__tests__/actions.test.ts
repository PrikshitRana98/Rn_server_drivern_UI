import { Alert, Keyboard } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { apiReq } from '@/utils/utils';
import { ActionRuntime, runAction, SduiAction } from '../actions';

jest.mock('@/utils/utils', () => ({ apiReq: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
// Translation keys come back as-is so messages are easy to assert
jest.mock('i18next', () => ({
    t: (key: string, options?: Record<string, any>) => (options ? `${key}:${JSON.stringify(options)}` : key),
}));

const mockApiReq = apiReq as jest.Mock;

const createRuntime = (scope: Record<string, any> = {}) => {
    const navigation = { navigate: jest.fn() };
    const setState = jest.fn();
    const runtime: ActionRuntime = {
        scope: { data: {}, state: {}, ...scope },
        navigation: navigation as any,
        setState,
    };
    return { runtime, navigation, setState };
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => { });
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});

describe('navigate', () => {
    it('navigates to the bound screen', async () => {
        const { runtime, navigation } = createRuntime({ item: { route: 'Settings' } });

        await runAction({ type: 'navigate', screen: '{{item.route}}' }, runtime);

        expect(navigation.navigate).toHaveBeenCalledWith('Settings', undefined);
    });

    it('passes params for nested navigators', async () => {
        const { runtime, navigation } = createRuntime();

        await runAction({ type: 'navigate', screen: 'Main', params: { screen: 'Home' } }, runtime);

        expect(navigation.navigate).toHaveBeenCalledWith('Main', { screen: 'Home' });
    });
});

describe('copy', () => {
    it('copies the resolved text and confirms it', async () => {
        const { runtime } = createRuntime({ data: { coupon: { code: 'EOSS10' } } });

        await runAction({ type: 'copy', text: '{{data.coupon.code}}' }, runtime);

        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('EOSS10');
        expect(Alert.alert).toHaveBeenCalledWith('COPIED');
    });
});

describe('setState', () => {
    it('writes plain values', async () => {
        const { runtime, setState } = createRuntime();

        await runAction({ type: 'setState', key: 'showCouponModal', value: true }, runtime);

        expect(setState).toHaveBeenCalledWith('showCouponModal', true);
    });

    it('writes a whole bound object, not a string', async () => {
        const offer = { id: 'o1', title: 'Free Delivery' };
        const { runtime, setState } = createRuntime({ item: offer });

        await runAction({ type: 'setState', key: 'selectedOffer', value: '{{item}}' }, runtime);

        expect(setState).toHaveBeenCalledWith('selectedOffer', offer);
    });
});

describe('sequence', () => {
    it('runs every action in order', async () => {
        const { runtime, setState } = createRuntime({ item: { id: 'o2' } });

        await runAction({
            type: 'sequence',
            actions: [
                { type: 'setState', key: 'selectedOffer', value: '{{item}}' },
                { type: 'setState', key: 'showOfferSheet', value: true },
            ],
        }, runtime);

        expect(setState.mock.calls).toEqual([
            ['selectedOffer', { id: 'o2' }],
            ['showOfferSheet', true],
        ]);
    });
});

describe('api', () => {
    const submit: SduiAction = {
        type: 'api',
        method: 'post',
        url: 'https://dummyjson.com/users/add',
        body: { email: '{{state.email}}', gender: '{{state.gender}}' },
        validate: { email: 'email', gender: 'required' },
        resultKey: 'formResult',
        loadingKey: 'formLoading',
        errorKey: 'formError',
    };

    it('sends the resolved body and stores the response', async () => {
        mockApiReq.mockResolvedValueOnce({ id: 209 });
        const { runtime, setState } = createRuntime({ state: { email: 'a@b.com', gender: 'female' } });

        await runAction({ ...submit }, runtime);

        expect(mockApiReq).toHaveBeenCalledWith(
            'https://dummyjson.com/users/add',
            { email: 'a@b.com', gender: 'female' },
            'post',
        );
        expect(setState.mock.calls).toEqual([
            ['formLoading', true],
            ['formError', null],
            ['formResult', { id: 209 }],
            ['formLoading', false],
        ]);
        expect(Keyboard.dismiss).toHaveBeenCalled();
    });

    it('defaults to POST', async () => {
        mockApiReq.mockResolvedValueOnce({});
        const { runtime } = createRuntime();

        await runAction({ type: 'api', url: 'https://api.test/x' }, runtime);

        expect(mockApiReq).toHaveBeenCalledWith('https://api.test/x', {}, 'post');
    });

    it('stores the error message when the request fails', async () => {
        mockApiReq.mockRejectedValueOnce({ message: 'Invalid credentials' });
        const { runtime, setState } = createRuntime({ state: { email: 'a@b.com', gender: 'male' } });

        await runAction({ ...submit }, runtime);

        expect(setState).toHaveBeenCalledWith('formError', 'Invalid credentials');
        expect(setState).toHaveBeenLastCalledWith('formLoading', false);
        expect(setState).not.toHaveBeenCalledWith('formResult', expect.anything());
    });

    it('does not call the API when a required field is empty', async () => {
        const { runtime, setState } = createRuntime({ state: { email: '', gender: 'male' } });

        await runAction({ ...submit }, runtime);

        expect(mockApiReq).not.toHaveBeenCalled();
        expect(setState).toHaveBeenCalledWith('formError', 'FIELD_REQUIRED:{"field":"email"}');
    });

    it('rejects an invalid email', async () => {
        const { runtime, setState } = createRuntime({ state: { email: 'abc', gender: 'male' } });

        await runAction({ ...submit }, runtime);

        expect(mockApiReq).not.toHaveBeenCalled();
        expect(setState).toHaveBeenCalledWith('formError', 'INVALID_EMAIL');
    });

    it('checks every rule, not just the first field', async () => {
        const { runtime, setState } = createRuntime({ state: { email: 'a@b.com', gender: '' } });

        await runAction({ ...submit }, runtime);

        expect(mockApiReq).not.toHaveBeenCalled();
        expect(setState).toHaveBeenCalledWith('formError', 'FIELD_REQUIRED:{"field":"gender"}');
    });

    it('shows an alert for validation errors when there is no errorKey', async () => {
        const { runtime } = createRuntime({ state: {} });

        await runAction({ type: 'api', url: 'https://api.test/x', validate: { email: 'required' } }, runtime);

        expect(Alert.alert).toHaveBeenCalledWith('FIELD_REQUIRED:{"field":"email"}');
    });

    it('ignores a second tap while the same request is still running', async () => {
        let finish: (value: unknown) => void = () => { };
        mockApiReq.mockImplementationOnce(() => new Promise(res => { finish = res; }));
        const action: SduiAction = { type: 'api', url: 'https://api.test/slow' };
        const { runtime } = createRuntime();

        const first = runAction(action, runtime);
        await runAction(action, runtime);
        expect(mockApiReq).toHaveBeenCalledTimes(1);

        finish({});
        await first;

        mockApiReq.mockResolvedValueOnce({});
        await runAction(action, runtime);
        expect(mockApiReq).toHaveBeenCalledTimes(2);
    });

    it('lets a different button call the API while another request is running', async () => {
        mockApiReq.mockImplementationOnce(() => new Promise(() => { }));
        mockApiReq.mockResolvedValueOnce({});
        const { runtime } = createRuntime();

        runAction({ type: 'api', url: 'https://api.test/a' }, runtime);
        await runAction({ type: 'api', url: 'https://api.test/b' }, runtime);

        expect(mockApiReq).toHaveBeenCalledTimes(2);
    });
});

describe('unknown actions', () => {
    it('warns instead of crashing', async () => {
        const { runtime } = createRuntime();

        await expect(runAction({ type: 'flyAway' } as any, runtime)).resolves.toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith('SDUI: unsupported action', 'flyAway');
    });
});
