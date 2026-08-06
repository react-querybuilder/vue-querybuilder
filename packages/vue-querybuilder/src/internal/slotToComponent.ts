import type { Component, Slot, VNodeChild } from 'vue';

/**
 * One wrapper component per slot function, forever. Component identity drives Vue's
 * mount/unmount, and `useSlots()` hands back a fresh function on every render, so an uncached
 * wrapper would tear down and re-create the entire subtree on every unrelated prop change.
 */
// oxlint-disable-next-line typescript/no-explicit-any
const wrapperCache = new WeakMap<Slot<any>, Component<any>>();

/**
 * Adapts a scoped slot to the `Component` shape that {@link Controls} entries have, so a slot
 * and a `controlElements` entry are interchangeable everywhere downstream.
 *
 * A Vue slot already _is_ `(props) => VNodeChild`, so the wrapper is a functional component that
 * forwards its props object straight through. The object itself is forwarded rather than a
 * spread copy, so nothing is lost on the way.
 *
 * Deliberately a functional component rather than an SFC, for the same reason as `Label`: an SFC
 * template emits whitespace text nodes, and the conformance suite asserts byte-level DOM parity.
 * A functional component renders exactly what the slot returns — no wrapper element, no
 * whitespace — and works identically in client and server modes.
 *
 * The result is cached by slot identity, so calling this repeatedly with the same slot yields
 * the same component.
 */
export const slotToComponent = <P extends Record<string, unknown>>(slot: Slot<P>): Component<P> => {
  const cached = wrapperCache.get(slot);
  if (cached) return cached as Component<P>;

  const wrapper = ((props: P) => slot(props) as VNodeChild) as Component<P>;
  // Declared so that Vue passes the props object through as the first argument rather than
  // treating every key as a fallthrough attribute.
  (wrapper as { inheritAttrs?: boolean }).inheritAttrs = false;

  wrapperCache.set(slot, wrapper);
  return wrapper;
};
