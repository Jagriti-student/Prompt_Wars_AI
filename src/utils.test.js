const calculateRisk = require('./utils');

test('high density gives HIGH risk', () => {
    expect(calculateRisk(9)).toBe("HIGH");
});

test('low density gives SAFE', () => {
    expect(calculateRisk(3)).toBe("SAFE");
});
test('boundary condition', () => {
    expect(calculateRisk(7)).toBe("SAFE");
});