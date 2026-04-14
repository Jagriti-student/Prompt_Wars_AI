import { describe, it, expect } from 'vitest';
import { findShortestPath, findNearestExit, calculateConfidence } from './Pathfinding';

describe('Pathfinding Logic', () => {
    it('finds the shortest path between two simple nodes', () => {
        const start = "Gate 1";
        const end = "Corridor A";
        const result = findShortestPath(start, end);
        expect(result.path).toEqual(["Gate 1", "Corridor A"]);
        expect(result.totalTime).toBeGreaterThan(0);
    });

    it('returns empty path for unreachable destination', () => {
        const start = "Gate 1";
        const end = "Non Existent Node";
        const result = findShortestPath(start, end);
        expect(result.path).toEqual([]);
    });

    it('finds the nearest exit in emergency mode', () => {
        const start = "North Stand";
        const result = findNearestExit(start, {});
        expect(result.exit).toBeDefined();
        expect(result.path.length).toBeGreaterThan(0);
    });

    it('calculates high confidence for empty/safe zones', () => {
        const path = ["Gate 1", "Corridor A"];
        const densities = { "Gate 1": 1, "Corridor A": 1 };
        const confidence = calculateConfidence(path, densities);
        expect(confidence.safetyScore).toBeGreaterThan(80);
    });

    it('lowers confidence for high density zones', () => {
        const path = ["Gate 1", "Corridor A"];
        const densities = { "Gate 1": 9, "Corridor A": 9 };
        const confidence = calculateConfidence(path, densities);
        expect(confidence.safetyScore).toBeLessThan(50);
    });

    it('handles offline sensors by assuming fallback density', () => {
        const start = "Gate 1";
        const end = "Corridor A";
        const densities = { "Corridor A": null }; // Offline
        const result = findShortestPath(start, end, densities);
        expect(result.path).toEqual(["Gate 1", "Corridor A"]);
        // Should use fallback penalty
        expect(result.totalTime).toBeGreaterThan(0);
    });
});
