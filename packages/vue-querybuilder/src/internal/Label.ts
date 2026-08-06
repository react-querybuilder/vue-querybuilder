import type { FunctionalComponent, VNodeChild } from 'vue';
import type { LabelNode } from '../types/translations.js';

/**
 * Props for {@link Label}.
 */
export interface LabelProps {
  label?: LabelNode | null;
}

/**
 * Renders a {@link LabelNode} — a plain string or arbitrary renderable Vue content.
 *
 * Every translatable label in this package accepts `VNodeChild | string`, so every render site
 * needs the same handling. This is that handling, factored out.
 *
 * Deliberately a functional component rather than an SFC: an SFC template emits whitespace text
 * nodes, and the conformance suite asserts byte-level DOM parity with React Query Builder. A
 * functional component returns exactly what it is given and nothing else — no wrapper element,
 * no whitespace — so it is safe to use inline where the surrounding DOM structure matters.
 *
 * Renders nothing for `undefined`/`null`.
 */
export const Label: FunctionalComponent<LabelProps> = props => (props.label ?? null) as VNodeChild;

Label.props = ['label'];
Label.inheritAttrs = false;
Label.displayName = 'Label';
