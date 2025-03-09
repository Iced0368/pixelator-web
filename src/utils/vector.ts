export type Vector<N extends number> = [number, ...number[]] & { length: N };

export namespace VectorUtils {
    export function add<N extends number>(v1: Vector<N>, v2: Vector<N>) {
        return v1.map((x, i) => x + v2[i]) as Vector<N>;
    }

    export function diff<N extends number>(v1: Vector<N>, v2: Vector<N>) {
        return v1.map((x, i) => x - v2[i]) as Vector<N>;
    }

    export function scale<N extends number>(v: Vector<N>, scalar: number) {
        return v.map(x => x * scalar) as Vector<N>;
    }

    export function l1norm<N extends number>(v: Vector<N>) {
        return v.reduce((sum, val) => sum + Math.abs(val), 0);
    }

    export function l2norm<N extends number>(v: Vector<N>) {
        return Math.sqrt(v.reduce((sum, val) => sum + val*val));
    }

    export function zerosLike<N extends number>(v: Vector<N>) {
        const N = v.length;
        return Array(N).fill(0) as Vector<N>;
    }
}