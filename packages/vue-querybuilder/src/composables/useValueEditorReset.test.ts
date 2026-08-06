import { describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import { runInScope } from '../../test/support.js';
import type { ValueEditorResetDeps } from './useValueEditorReset.js';
import { useValueEditorReset } from './useValueEditorReset.js';

/**
 * Installs the watcher over a reactive deps object and returns both, plus the scope.
 *
 * `handleOnChange` writes the new value straight back into `deps.value`, which is exactly the
 * feedback path that would loop if the write were tracked.
 */
const setup = (initial: Partial<ValueEditorResetDeps> = {}) => {
  const handleOnChange = vi.fn((v: unknown) => {
    deps.value = v;
  });
  const deps = reactive<ValueEditorResetDeps>({
    operator: '=',
    value: '',
    type: 'text',
    inputType: 'text',
    handleOnChange,
    ...initial,
  });
  const { scope } = runInScope(() => useValueEditorReset(deps));
  return { deps, handleOnChange, scope };
};

describe('useValueEditorReset', () => {
  it('does not reset a value that is already valid', async () => {
    const { handleOnChange } = setup({ operator: '=', value: 'Steve' });
    await nextTick();
    await nextTick();
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('does not apply the mount-time check before the first tick', () => {
    // The conformance suite extracts the DOM before `nextTick()`, matching
    // `renderToStaticMarkup`, so nothing may have been written by then.
    const { handleOnChange } = setup({ operator: '=', value: ['a', 'b'] });
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('applies the mount-time check on the first tick', async () => {
    const { handleOnChange } = setup({ operator: '=', value: ['a', 'b'] });
    await nextTick();
    expect(handleOnChange).toHaveBeenCalledTimes(1);
  });

  it('collapses a multi-value value when the operator leaves "between"', async () => {
    const { deps, handleOnChange } = setup({ operator: 'between', value: ['10', '20'] });
    await nextTick();
    // `between` is a list operator, so the array is left alone on mount.
    expect(handleOnChange).not.toHaveBeenCalled();

    deps.operator = '=';
    await nextTick();

    expect(handleOnChange).toHaveBeenCalledTimes(1);
    expect(deps.value).toBe('10');
  });

  it('expands into "between" without looping', async () => {
    const { deps, handleOnChange } = setup({ operator: '=', value: '10' });
    await nextTick();
    handleOnChange.mockClear();

    deps.operator = 'between';
    await nextTick();
    await nextTick();

    // Whatever core decides, it must settle after a single write.
    expect(handleOnChange.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('collapses a multi-value list when the operator leaves "in"', async () => {
    const { deps, handleOnChange } = setup({ operator: 'in', value: ['a', 'b', 'c'] });
    await nextTick();
    expect(handleOnChange).not.toHaveBeenCalled();

    deps.operator = '=';
    await nextTick();

    expect(handleOnChange).toHaveBeenCalledTimes(1);
    expect(deps.value).toBe('a');
  });

  it('resets a comma-containing value for a number input', async () => {
    const { deps, handleOnChange } = setup({ operator: '=', value: '10,20', inputType: 'number' });
    await nextTick();

    expect(handleOnChange).toHaveBeenCalledTimes(1);
    expect(deps.value).toBe('10');
  });

  it('respects skipHook', async () => {
    const { handleOnChange } = setup({
      operator: '=',
      value: '10,20',
      inputType: 'number',
      skipHook: true,
    });
    await nextTick();
    await nextTick();
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('re-evaluates when inputType changes', async () => {
    const { deps, handleOnChange } = setup({ operator: '=', value: '10,20', inputType: 'text' });
    await nextTick();
    handleOnChange.mockClear();

    deps.inputType = 'number';
    await nextTick();

    expect(handleOnChange).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates when type changes, as a valueSource flip does', async () => {
    // `valueSource` is not itself an input to `getValueEditorReset` in core 8.22.2. Flipping it
    // to `"field"` or `"parameter"` reaches this watcher indirectly, as a change to `type`
    // (and `values`) resolved by `deriveRuleContext`. So that is what is exercised here.
    const { deps, handleOnChange } = setup({ operator: '=', value: 'a', type: 'text' });
    await nextTick();
    handleOnChange.mockClear();

    // valueSource: "value" -> "field"/"parameter" presents a selector.
    deps.type = 'select';
    await nextTick();
    expect(handleOnChange).not.toHaveBeenCalled();

    // ...and back again.
    deps.type = 'text';
    await nextTick();
    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('collapses a multi-value editor to a single value when the type narrows', async () => {
    const { deps, handleOnChange } = setup({
      operator: '=',
      value: ['a', 'b'],
      type: 'multiselect',
    });
    await nextTick();
    // A multiselect legitimately holds an array.
    expect(handleOnChange).not.toHaveBeenCalled();

    deps.type = 'text';
    await nextTick();

    expect(handleOnChange).toHaveBeenCalledTimes(1);
    expect(deps.value).toBe('a');
  });

  it('is idempotent — applying a reset does not trigger another', async () => {
    const { handleOnChange } = setup({ operator: '=', value: ['a', 'b'] });
    await nextTick();
    await nextTick();
    await nextTick();
    expect(handleOnChange).toHaveBeenCalledTimes(1);
  });

  it('does not recurse when handleOnChange writes back into a tracked dependency', async () => {
    // The stability test: `handleOnChange` assigns `deps.value`, a dependency of this very
    // watcher. An auto-tracked effect would re-enter here; the explicit dep array plus the
    // re-entrancy flag mean it settles.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { deps, handleOnChange } = setup({ operator: 'between', value: '1,2' });
    await nextTick();

    for (let i = 0; i < 5; i++) {
      deps.operator = i % 2 === 0 ? '=' : 'between';
      await nextTick();
    }

    expect(handleOnChange.mock.calls.length).toBeLessThan(10);
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum recursive updates exceeded')
    );
    warn.mockRestore();
  });

  it('accepts a getter and stops with its scope', async () => {
    const handleOnChange = vi.fn();
    const deps = reactive<ValueEditorResetDeps>({ operator: '=', value: 'ok', handleOnChange });
    const { result, scope } = runInScope(() => useValueEditorReset(() => deps));
    expect(result.stop).toBeTypeOf('function');

    scope.stop();
    deps.value = ['a', 'b'];
    await nextTick();
    await nextTick();

    expect(handleOnChange).not.toHaveBeenCalled();
  });

  it('does not run the deferred mount check after its scope is disposed', async () => {
    const handleOnChange = vi.fn();
    const deps: ValueEditorResetDeps = { operator: '=', value: ['a', 'b'], handleOnChange };
    const { scope } = runInScope(() => useValueEditorReset(deps));
    // Disposed within the same tick, before the deferred check runs.
    scope.stop();
    await nextTick();
    await nextTick();

    expect(handleOnChange).not.toHaveBeenCalled();
  });
});
