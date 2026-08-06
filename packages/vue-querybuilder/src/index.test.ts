import * as core from '@react-querybuilder/core';
import { describe, expect, it } from 'vitest';
import * as vqb from './index';

describe('barrel', () => {
  it('re-exports @react-querybuilder/core in full', () => {
    for (const key of Object.keys(core)) {
      expect(vqb).toHaveProperty(key);
    }
  });

  it('re-exports formatQuery', () => {
    expect(vqb.formatQuery({ combinator: 'and', rules: [] }, 'sql')).toBe('(1 = 1)');
  });
});
