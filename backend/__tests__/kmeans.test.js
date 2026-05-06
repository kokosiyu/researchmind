import { kmeans, elbowMethod, autoSelectK, euclideanDistance, cosineDistance } from '../services/kmeans.js';

describe('K-Means 聚类算法', () => {
  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    });

    it('should compute correct distance', () => {
      const d = euclideanDistance([0, 0], [3, 4]);
      expect(d).toBeCloseTo(5, 10);
    });

    it('should handle different dimensions implicitly', () => {
      const d = euclideanDistance([1, 2, 3], [1, 2]);
      expect(d).toBeCloseTo(Math.sqrt(9), 10);
    });

    it('should be symmetric', () => {
      const a = [1, 5, 9];
      const b = [2, 3, 7];
      expect(euclideanDistance(a, b)).toBeCloseTo(euclideanDistance(b, a), 10);
    });
  });

  describe('cosineDistance', () => {
    it('should return 0 for identical vectors', () => {
      expect(cosineDistance([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    });

    it('should return 1 for orthogonal vectors', () => {
      expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1, 10);
    });

    it('should be in range [0, 2]', () => {
      const d = cosineDistance([1, -1], [-1, 1]);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(2);
    });
  });

  describe('kmeans', () => {
    it('should return empty result for empty input', () => {
      const result = kmeans([]);
      expect(result.assignments).toEqual([]);
      expect(result.centroids).toEqual([]);
    });

    it('should handle single vector', () => {
      const result = kmeans([[1, 2, 3]], { k: 1 });
      expect(result.assignments).toEqual([0]);
    });

    it('should handle k >= number of vectors', () => {
      const vectors = [[1, 0], [0, 1]];
      const result = kmeans(vectors, { k: 3 });
      expect(result.assignments.length).toBe(2);
    });

    it('should cluster clearly separated groups correctly', () => {
      const vectors = [
        [1, 0], [1.1, 0.1], [0.9, 0.2],
        [10, 10], [10.1, 9.9], [9.8, 10.2],
      ];
      const result = kmeans(vectors, { k: 2, seed: 1 });

      const cluster0 = result.assignments.slice(0, 3);
      const cluster1 = result.assignments.slice(3, 6);

      expect(new Set(cluster0).size).toBe(1);
      expect(new Set(cluster1).size).toBe(1);
      expect(cluster0[0]).not.toBe(cluster1[0]);
    });

    it('should return centroids matching the number of clusters', () => {
      const vectors = [
        [1, 2], [2, 3], [3, 4], [10, 11], [11, 12], [12, 13]
      ];
      const result = kmeans(vectors, { k: 3 });
      expect(result.centroids.length).toBe(3);
    });

    it('should converge within maxIterations', () => {
      const vectors = [
        [1, 2], [2, 3], [3, 4], [10, 11], [11, 12], [12, 13]
      ];
      const result = kmeans(vectors, { k: 2, maxIterations: 200 });
      expect(result.iterations).toBeLessThanOrEqual(200);
    });

    it('should have inertia >= 0', () => {
      const vectors = [
        [1, 2], [10, 20], [5, 5]
      ];
      const result = kmeans(vectors, { k: 2 });
      expect(result.inertia).toBeGreaterThanOrEqual(0);
    });

    it('should produce lower inertia with optimal k for clearly separated data', () => {
      const vectors = [
        [1, 0], [1.1, 0.1], [0.9, 0.2], [1, 0.1],
        [10, 10], [10.1, 9.9], [9.8, 10.2], [10, 9.9],
      ];
      const resultK1 = kmeans(vectors, { k: 1 });
      const resultK2 = kmeans(vectors, { k: 2 });
      expect(resultK2.inertia).toBeLessThan(resultK1.inertia);
    });
  });

  describe('elbowMethod', () => {
    it('should return results for k=1 to maxK', () => {
      const vectors = [
        [1, 2], [2, 3], [10, 11], [11, 12], [5, 5]
      ];
      const results = elbowMethod(vectors, 4);
      expect(results.length).toBe(4);
      expect(results[0].k).toBe(1);
      expect(results[1].k).toBe(2);
    });

    it('should have decreasing inertia with increasing k', () => {
      const vectors = [
        [1, 0], [1.1, 0.1], [0.9, 0.2],
        [10, 10], [10.1, 9.9], [9.8, 10.2],
      ];
      const results = elbowMethod(vectors, 4);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].inertia).toBeLessThanOrEqual(results[i - 1].inertia + 1e-6);
      }
    });
  });

  describe('autoSelectK', () => {
    it('should return k=1 for very few vectors', () => {
      const vectors = [[1, 2]];
      const result = autoSelectK(vectors, 5);
      expect(result.k).toBe(1);
    });

    it('should select optimal k for clearly separated data', () => {
      const vectors = [
        [1, 0], [1.1, 0.1], [0.9, 0.2], [1, 0.1],
        [10, 10], [10.1, 9.9], [9.8, 10.2], [10, 9.9],
        [20, 20], [20.1, 19.9], [19.8, 20.2], [20, 20.1],
      ];
      const result = autoSelectK(vectors, 6);
      expect(result.k).toBeGreaterThanOrEqual(2);
      expect(result.k).toBeLessThanOrEqual(5);
      expect(result.elbowResults.length).toBeGreaterThan(0);
    });
  });
});
