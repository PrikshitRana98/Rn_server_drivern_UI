import { getValue, isVisible, resolve, resolveDeep } from '../binding';

const scope = {
    data: {
        user: { name: 'Rick', age: 70, tags: ['scientist', 'grandpa'] },
        stats: [{ id: 's1', value: '128' }],
    },
    state: { email: 'rick@citadel.com', loading: false, count: 0, empty: [], user: null },
    item: { title: 'Settings', route: 'Settings' },
    index: 2,
};

describe('getValue', () => {
    it('reads a dotted path', () => {
        expect(getValue(scope, 'data.user.name')).toBe('Rick');
    });

    it('reads array entries by index', () => {
        expect(getValue(scope, 'data.user.tags.1')).toBe('grandpa');
    });

    it('returns undefined for a missing path instead of throwing', () => {
        expect(getValue(scope, 'data.nope.deep.value')).toBeUndefined();
        expect(getValue(scope, 'state.user.name')).toBeUndefined();
    });
});

describe('resolve', () => {
    it('replaces a binding inside text', () => {
        expect(resolve('Hello {{data.user.name}}!', scope)).toBe('Hello Rick!');
    });

    it('replaces several bindings in one string', () => {
        expect(resolve('{{item.title}} -> {{item.route}}', scope)).toBe('Settings -> Settings');
    });

    it('ignores spaces inside the braces', () => {
        expect(resolve('{{ data.user.name }}', scope)).toBe('Rick');
    });

    it('returns the raw value when the whole string is one binding', () => {
        expect(resolve('{{data.stats}}', scope)).toBe(scope.data.stats);
        expect(resolve('{{data.user.age}}', scope)).toBe(70);
        expect(resolve('{{state.loading}}', scope)).toBe(false);
        expect(resolve('{{index}}', scope)).toBe(2);
    });

    it('turns missing values inside text into an empty string', () => {
        expect(resolve('Hi {{data.nope}}!', scope)).toBe('Hi !');
    });

    it('returns undefined for a missing single binding', () => {
        expect(resolve('{{data.nope}}', scope)).toBeUndefined();
    });

    it('keeps falsy values like 0 inside text', () => {
        expect(resolve('Count: {{state.count}}', scope)).toBe('Count: 0');
    });

    it('returns non-strings unchanged', () => {
        expect(resolve(42, scope)).toBe(42);
        expect(resolve(true, scope)).toBe(true);
        expect(resolve(null, scope)).toBeNull();
    });

    it('returns plain text without bindings unchanged', () => {
        expect(resolve('No bindings here', scope)).toBe('No bindings here');
    });
});

describe('resolveDeep', () => {
    it('resolves bindings in nested objects and arrays', () => {
        const input = {
            url: 'https://api.test/users/{{data.user.name}}',
            body: { email: '{{state.email}}', tags: ['{{data.user.tags.0}}', 'static'] },
            count: 5,
        };

        expect(resolveDeep(input, scope)).toEqual({
            url: 'https://api.test/users/Rick',
            body: { email: 'rick@citadel.com', tags: ['scientist', 'static'] },
            count: 5,
        });
    });

    it('does not mutate the original JSON', () => {
        const input = { text: '{{data.user.name}}' };
        resolveDeep(input, scope);
        expect(input.text).toBe('{{data.user.name}}');
    });

    it('keeps an object picked by a single binding', () => {
        expect(resolveDeep({ value: '{{item}}' }, scope)).toEqual({ value: scope.item });
    });
});

describe('isVisible', () => {
    it('is visible when there is no expression', () => {
        expect(isVisible(undefined, scope)).toBe(true);
        expect(isVisible('', scope)).toBe(true);
    });

    it('follows the truthiness of the value', () => {
        expect(isVisible('state.email', scope)).toBe(true);
        expect(isVisible('state.loading', scope)).toBe(false);
        expect(isVisible('state.user', scope)).toBe(false);
        expect(isVisible('data.missing', scope)).toBe(false);
    });

    it('treats empty arrays as hidden and filled arrays as visible', () => {
        expect(isVisible('state.empty', scope)).toBe(false);
        expect(isVisible('data.stats', scope)).toBe(true);
    });

    it('inverts the result with "!"', () => {
        expect(isVisible('!state.loading', scope)).toBe(true);
        expect(isVisible('!state.email', scope)).toBe(false);
        expect(isVisible('!state.empty', scope)).toBe(true);
    });
});
