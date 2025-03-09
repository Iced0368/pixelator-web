import { VectorUtils as vu, type Vector } from "./vector";

function getClosest<N extends number>
(
    vectors: Vector<N>[], 
    target: Vector<N>, 
    dist: (v1: Vector<N>, v2: Vector<N>) => number
) 
{
    let index = 0;
    let minDist = Infinity;
    for (let i = 0; i < vectors.length; i++) {
        const d = dist(vectors[i], target);
        if (d < minDist) {
            minDist = d;
            index = i;
        }
    }
    return index;
}

function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initCentroids<N extends number>
(
    k:number, 
    vectors: Vector<N>[], 
) 
{
    const candidiates = Array.from(
        new Set(vectors.map(vector => JSON.stringify(vector)))
    ).map(vectorString => JSON.parse(vectorString));

    const shuffled = shuffle(candidiates);
    return shuffled.slice(0, k);
}


export function getMean<N extends number>
(
    vectors: Vector<N>[],
) 
{
    return vectors.reduce(
        (sum, vector) => vu.add(sum, vector),
        vu.zerosLike(vectors[0])
    ).map(x => x / vectors.length) as Vector<N>;
}

export class KMeans<N extends number> {
    centroids: Vector<N>[];
    dist: (v1: Vector<N>, v2: Vector<N>) => number;

    constructor(k: number, vectors: Vector<N>[], dist: (v1: Vector<N>, v2: Vector<N>) => number) {
        this.centroids = initCentroids(k, vectors);
        this.dist = dist;

        let updated = true;
        while (updated) {
            updated = false;

            const clusters = Array.from({ length: k }, () => <Vector<N>[]>[]);
            for(const vector of vectors) {
                const index = getClosest(this.centroids, vector, dist);
                clusters[index].push(vector);
            }

            for (let i = 0; i < clusters.length; i++) {
                const centroid = getMean(clusters[i]);

                if (vu.l1norm(vu.diff(this.centroids[i], centroid)) > 0.01) {
                    updated = true;
                    this.centroids[i] = centroid;
                }
            }
        }
    }

    findCluster<N extends number>(v: Vector<N>) {
        return this.centroids[getClosest(this.centroids, v, this.dist)];
    }
}


export function getMedian<N extends number>
(
    vectors: Vector<N>[],
    dist: (v1: Vector<N>, v2: Vector<N>) => number
) 
{
    const medianVector: Vector<N> = vu.zerosLike(vectors[0]);

    for (let dim = 0; dim < vectors[0].length; dim++) {
      const dimValues = vectors.map(v => v[dim]);
      dimValues.sort((a, b) => a - b);
      medianVector[dim] = dimValues[Math.floor(dimValues.length / 2)];
    }
    return vectors[getClosest(vectors, medianVector, dist)];
}

export class KMedians<N extends number> {
    medoids: Vector<N>[];
    dist: (v1: Vector<N>, v2: Vector<N>) => number;

    constructor(k: number, vectors: Vector<N>[], dist: (v1: Vector<N>, v2: Vector<N>) => number) {
        this.medoids = initCentroids(k, vectors);
        this.dist = dist;

        let updated = true;
        let cnt = 0;
        while (updated) {
            updated = false;
            cnt += 1;

            const clusters = Array.from({ length: k }, () => <Vector<N>[]>[]);
            for(const vector of vectors) {
                const index = getClosest(this.medoids, vector, dist);
                clusters[index].push(vector);
            }

            for (let i = 0; i < clusters.length; i++) {
                const medoid = getMedian(clusters[i], dist);

                if (vu.l1norm(vu.diff(this.medoids[i], medoid)) > 0.01) {
                    updated = true;
                    this.medoids[i] = medoid;
                }
            }
        }
        console.log(cnt)
    }

    findCluster<N extends number>(v: Vector<N>) {
        return this.medoids[getClosest(this.medoids, v, this.dist)];
    }
}