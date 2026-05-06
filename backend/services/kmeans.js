import { cosineSimilarity } from './tfidf.js';

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function cosineDistance(a, b) {
  return 1 - cosineSimilarity(a, b);
}

function initializeCentroids(vectors, k, seed = 42) {
  const n = vectors.length;
  const selected = [];
  const used = new Set();

  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  let seedCounter = seed;
  const firstIdx = Math.floor(seededRandom(seedCounter++) * n);
  selected.push([...vectors[firstIdx]]);
  used.add(firstIdx);

  for (let i = 1; i < k; i++) {
    const distances = vectors.map((v, idx) => {
      if (used.has(idx)) return 0;
      let minDist = Infinity;
      for (const centroid of selected) {
        const d = euclideanDistance(v, centroid);
        if (d < minDist) minDist = d;
      }
      return minDist * minDist;
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) {
      for (let idx = 0; idx < n; idx++) {
        if (!used.has(idx)) {
          selected.push([...vectors[idx]]);
          used.add(idx);
          break;
        }
      }
      continue;
    }

    let random = seededRandom(seedCounter++) * totalDist;
    let idx = 0;
    for (; idx < n; idx++) {
      if (used.has(idx)) continue;
      random -= distances[idx];
      if (random <= 0) break;
    }
    if (idx >= n) idx = n - 1;
    while (used.has(idx) && idx > 0) idx--;

    selected.push([...vectors[idx]]);
    used.add(idx);
  }

  return selected;
}

function assignClusters(vectors, centroids, distanceFn = 'cosine') {
  const distCalc = distanceFn === 'cosine' ? cosineDistance : euclideanDistance;
  return vectors.map(v => {
    let minDist = Infinity;
    let bestCluster = 0;
    for (let i = 0; i < centroids.length; i++) {
      const d = distCalc(v, centroids[i]);
      if (d < minDist) {
        minDist = d;
        bestCluster = i;
      }
    }
    return bestCluster;
  });
}

function updateCentroids(vectors, assignments, k) {
  const dim = vectors[0].length;
  const newCentroids = Array.from({ length: k }, () => new Array(dim).fill(0));
  const counts = new Array(k).fill(0);

  for (let i = 0; i < vectors.length; i++) {
    const c = assignments[i];
    counts[c]++;
    for (let d = 0; d < dim; d++) {
      newCentroids[c][d] += vectors[i][d];
    }
  }

  for (let i = 0; i < k; i++) {
    if (counts[i] > 0) {
      for (let d = 0; d < dim; d++) {
        newCentroids[i][d] /= counts[i];
      }
    }
  }

  return newCentroids;
}

function computeInertia(vectors, centroids, assignments, distanceFn = 'cosine') {
  const distCalc = distanceFn === 'cosine' ? cosineDistance : euclideanDistance;
  let inertia = 0;
  for (let i = 0; i < vectors.length; i++) {
    const d = distCalc(vectors[i], centroids[assignments[i]]);
    inertia += d * d;
  }
  return inertia;
}

export function kmeans(vectors, options = {}) {
  const {
    k = 3,
    maxIterations = 100,
    tolerance = 1e-4,
    distanceFn = 'cosine',
    seed = 42
  } = options;

  if (!vectors || vectors.length === 0) {
    return { assignments: [], centroids: [], inertia: 0, iterations: 0 };
  }

  if (vectors.length <= k) {
    return {
      assignments: vectors.map((_, i) => i),
      centroids: vectors.map(v => [...v]),
      inertia: 0,
      iterations: 0
    };
  }

  let centroids = initializeCentroids(vectors, k, seed);
  let assignments = [];
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    const newAssignments = assignClusters(vectors, centroids, distanceFn);

    if (iter > 0) {
      let changed = false;
      for (let i = 0; i < newAssignments.length; i++) {
        if (newAssignments[i] !== assignments[i]) {
          changed = true;
          break;
        }
      }
      if (!changed) break;
    }

    assignments = newAssignments;
    const newCentroids = updateCentroids(vectors, assignments, k);

    let centroidShift = 0;
    for (let i = 0; i < k; i++) {
      centroidShift += euclideanDistance(centroids[i], newCentroids[i]);
    }
    centroids = newCentroids;

    if (centroidShift < tolerance) break;
  }

  const inertia = computeInertia(vectors, centroids, assignments, distanceFn);

  return { assignments, centroids, inertia, iterations };
}

export function elbowMethod(vectors, maxK = 10, distanceFn = 'cosine') {
  const n = vectors.length;
  const actualMaxK = Math.min(maxK, n, 10);
  const results = [];

  for (let k = 1; k <= actualMaxK; k++) {
    const result = kmeans(vectors, { k, distanceFn, maxIterations: 50 });
    results.push({
      k,
      inertia: result.inertia,
      iterations: result.iterations
    });
  }

  return results;
}

export function autoSelectK(vectors, maxK = 10, distanceFn = 'cosine') {
  const elbowResults = elbowMethod(vectors, maxK, distanceFn);

  if (elbowResults.length <= 2) {
    return { k: 1, elbowResults };
  }

  const inertias = elbowResults.map(r => r.inertia);
  let maxImprovement = 0;
  let bestK = 2;

  for (let i = 1; i < inertias.length - 1; i++) {
    const prevDiff = inertias[i - 1] - inertias[i];
    const nextDiff = inertias[i] - inertias[i + 1];
    const improvement = prevDiff - nextDiff;

    if (improvement > maxImprovement) {
      maxImprovement = improvement;
      bestK = i + 1;
    }
  }

  return { k: bestK, elbowResults };
}

export { euclideanDistance, cosineDistance };
