/**
 * @file binding.ts
 * @description Replaces `{{path}}` placeholders in SDUI JSON with real values from the scope.
 */

/** Values the JSON can point to, e.g. `{{data.user.name}}` reads `scope.data.user.name` */
export type SduiScope = Record<string, any>;

const BINDING_REGEX = /\{\{(.+?)\}\}/g;
const SINGLE_BINDING_REGEX = /^\{\{([^}]+)\}\}$/;

/**
 * Follows a dotted path inside the scope.
 *
 * @example
 * getValue({ data: { user: { name: 'Rick' } } }, 'data.user.name') // "Rick"
 */
export const getValue = (scope: SduiScope, path: string) =>
    path.split('.').reduce<any>((obj, key) => obj?.[key], scope);

/**
 * Replaces every `{{...}}` in a string with its value. Non-strings are returned as they are.
 * A string that is exactly one binding returns the raw value, so arrays and objects survive
 * (needed for `"items": "{{data.stats}}"`). Missing values inside text become an empty string.
 *
 * @example
 * resolve('Hello {{data.user.name}}', scope) // "Hello Rick"
 * resolve('{{data.stats}}', scope)           // [{...}, {...}]
 */
export const resolve = (value: any, scope: SduiScope) => {
    if (typeof value !== 'string') return value;

    const single = value.match(SINGLE_BINDING_REGEX);
    if (single) return getValue(scope, single[1].trim());

    return value.replace(BINDING_REGEX, (_, path: string) => {
        const result = getValue(scope, path.trim());
        return result == null ? '' : String(result);
    });
};

/**
 * Resolves bindings everywhere inside objects and arrays (props, actions).
 */
export const resolveDeep = (value: any, scope: SduiScope): any => {
    if (Array.isArray(value)) return value.map(item => resolveDeep(item, scope));
    if (value && typeof value === 'object') {
        const result: Record<string, any> = {};
        Object.keys(value).forEach(key => {
            result[key] = resolveDeep(value[key], scope);
        });
        return result;
    }
    return resolve(value, scope);
};

/**
 * Evaluates `visibleIf`. `"item.route"` shows the node when the value exists,
 * `"!item.route"` shows it when it doesn't. No expression means always visible.
 */
export const isVisible = (expression: string | undefined, scope: SduiScope) => {
    if (!expression) return true;
    const negate = expression.startsWith('!');
    const value = getValue(scope, (negate ? expression.slice(1) : expression).trim());
    const truthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
    return negate ? !truthy : truthy;
};
