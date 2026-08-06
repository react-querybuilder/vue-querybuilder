import type { InputType } from '@react-querybuilder/core';
import { getValueEditorReset } from '@react-querybuilder/core';
import type { MaybeRefOrGetter, WatchHandle } from 'vue';
import { nextTick, onScopeDispose, toValue, watch } from 'vue';

/**
 * The subset of `ValueEditorProps` that determines whether the value needs to be reset.
 */
export interface ValueEditorResetDeps {
  operator: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  value: any;
  type?: string;
  inputType?: InputType | null;
  /** Set when an ancestor component has already applied the reset. */
  skipHook?: boolean;
  /** Applies the reset. */
  // oxlint-disable-next-line typescript/no-explicit-any
  handleOnChange: (value: any) => void;
}

/**
 * Installs the watcher that collapses a rule's `value` when it stops representing a list — for
 * example when the operator changes from `in` or `between` to `=`, or when an
 * `<input type="number">` is handed a comma-containing string it cannot display.
 *
 * Core decides *what* the value should become (`getValueEditorReset`); this decides *when*.
 * That split is why `deriveValueEditor.ts:26` supplies no timing of its own.
 *
 * Four things keep this from looping:
 *
 * 1. **An explicit dependency array, never `watchEffect`.** Auto-tracking means the tracked set
 *    changes depending on which branch runs, which is exactly the loop failure mode. Enumerating
 *    the dependencies removes the hazard by construction.
 * 2. **`flush: 'post'`**, matching React's post-commit `useEffect`. A pre-flush write would
 *    reorder against the render that produced the value being reset.
 * 3. **A re-entrancy flag.** `getValueEditorReset` is idempotent, so a follow-up run is already
 *    a no-op, but Vue's failure mode for a runaway effect is a silent recursion warning rather
 *    than a thrown error — worth the four lines.
 * 4. The callback reads nothing it does not already depend on, so `handleOnChange` writing back
 *    into state cannot widen the tracked set.
 *
 * The mount-time run is scheduled on the next tick rather than passed as `immediate: true`.
 * Vue invokes an immediate callback synchronously at watch creation, ignoring `flush: 'post'`,
 * which would apply the reset *before* first render; React applies it after. Deferring keeps the
 * first painted DOM identical to React's, which the conformance suite asserts by extracting
 * before `nextTick()`.
 *
 * @returns The watch handle, so a caller can stop it early. It is otherwise bound to the
 * enclosing effect scope.
 */
export const useValueEditorReset = (deps: MaybeRefOrGetter<ValueEditorResetDeps>): WatchHandle => {
  let applying = false;

  const check = (
    operator: string,
    // oxlint-disable-next-line typescript/no-explicit-any
    value: any,
    type: string | undefined,
    inputType: InputType | null | undefined,
    skipHook: boolean | undefined
  ): void => {
    if (applying) return;

    const { reset, value: nextValue } = getValueEditorReset({
      skipHook,
      type: type ?? undefined,
      operator,
      value,
      inputType,
    });

    if (!reset) return;

    applying = true;
    try {
      toValue(deps).handleOnChange(nextValue);
    } finally {
      applying = false;
    }
  };

  const handle = watch(
    [
      () => toValue(deps).operator,
      () => toValue(deps).value,
      () => toValue(deps).type,
      () => toValue(deps).inputType,
      () => toValue(deps).skipHook,
    ],
    ([operator, value, type, inputType, skipHook]) => {
      check(operator, value, type, inputType, skipHook);
    },
    { flush: 'post' }
  );

  // The mount-time run, deferred to the first post-flush tick. See the note above. Guarded so a
  // scope disposed within the same tick does not still apply a reset.
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  }, true);
  nextTick(() => {
    if (disposed) return;
    const { operator, value, type, inputType, skipHook } = toValue(deps);
    check(operator, value, type, inputType, skipHook);
  });

  return handle;
};
