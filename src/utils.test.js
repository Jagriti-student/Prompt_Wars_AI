import { calculateRisk } from './utils';
import { describe, it, expect } from 'vitest';

describe('Legacy Utils', () => {
    it('high density gives HIGH risk', () => {
        expect(calculateRisk(9)).toBe("HIGH");
    });

    it('low density gives SAFE', () => {
        expect(calculateRisk(3)).toBe("SAFE");
    });

    it('boundary condition', () => {
        expect(calculateRisk(7)).toBe("SAFE");
    });
});