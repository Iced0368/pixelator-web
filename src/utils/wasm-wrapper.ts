import cv, { type Mat } from 'opencv-ts';
import TransformModule from '../assembly/build/transform.js'

const Module: WebAssembly.Module & {
    _malloc: (length: number) => number,
    _free: (length: number) => void,
    _medianResize: (
        srcPtr: number, dstPtr: number, 
        height: number, width: number,
        newHeight: number, newWidth: number, 
    ) => void,
    _convertGrayToRGBA: (srcPtr: number, dstPtr: number, length: number) => void,
    _emphasizeEdge: (
        srcPtr: number, dstPtr: number, imgPtr: number, 
        edgePtr: number, edgenessPtr: number,
        height: number, width: number,
        newHeight: number, newWidth: number, 
        sensitivity: number
    ) => void,
    _kdMeansQuantization: (
        src: number, dst: number,
        height: number, width: number, k: number
    ) => void,
}
= await TransformModule();

export class CArray { 
    ptr: number;
    length: number;

    constructor(arg: number | Uint8ClampedArray | undefined) {
        if (arg === undefined) {
            this.ptr = 0;
            this.length = 0;
        }
        else if (typeof arg === 'number') {
            this.ptr = Module._malloc(arg);
            this.length = arg;
        }
        else {
            const ptr = Module._malloc(arg.length);
            Module.HEAPU8.set(arg, ptr);
            this.ptr = ptr;
            this.length = arg.length;
        }
    }

};

export function free(cArray: CArray) {
    Module._free(cArray.ptr);
}

export function convertCArrayToArray(cArray: CArray) {
    const array = new Uint8ClampedArray(cArray.length);
    array.set(Module.HEAPU8.subarray(cArray.ptr, cArray.ptr + cArray.length));
    return array;
}

export function medianResize
(
    src: CArray, dst:CArray,
    height: number, width: number,
    newHeight: number, newWidth: number, 
) 
{
    Module._medianResize(
        src.ptr, dst.ptr,
        height, width,
        newHeight, newWidth, 
    );
}

export function convertGrayToRGBA(
    src: CArray, dst: CArray
) {
    Module._convertGrayToRGBA(src.ptr, dst.ptr, src.length);
}

export function emphasizeEdge(
    src: CArray, dst: CArray, img: CArray, 
    edge: CArray, edgeness: CArray,
    height: number, width: number,
    newHeight: number, newWidth: number, 
    sensitivity: number
) {
    Module._emphasizeEdge(
        src.ptr, dst.ptr, img.ptr, edge.ptr, edgeness.ptr,
        height, width, newHeight, newWidth, 
        sensitivity
    );
}

export function kdMeansQuantization(
    src: CArray, dst: CArray,
    height: number, width: number, k: number
) {
    Module._kdMeansQuantization(src.ptr, dst.ptr, height, width, k);
}

export function kmeansQuantization(srcMat: Mat, dstMat: Mat, k: number) {
    const samples = new cv.Mat();
    srcMat.convertTo(samples, cv.CV_32F);

    const N = samples.rows * samples.cols;

    samples.cols = N;
    samples.rows = 1;

    const labels = new cv.Mat();
    const centers = new cv.Mat();
    const criteria = new cv.TermCriteria(3, 10, 1.0);

    cv.kmeans(samples, k, labels, criteria, 1, cv.KMEANS_PP_CENTERS, centers);

    console.time("label");
    const centers8U = new cv.Mat();
    centers.convertTo(centers8U, cv.CV_8U);

    for (let i = 0; i < N; i++) {
        dstMat.data[4 * i] = centers8U.ucharAt(labels.intAt(i), 0);
        dstMat.data[4 * i + 1] = centers8U.ucharAt(labels.intAt(i), 1);
        dstMat.data[4 * i + 2] = centers8U.ucharAt(labels.intAt(i), 2);
        dstMat.data[4 * i + 3] = srcMat.data[4 * i + 3];
    }

    console.timeEnd("label");

    samples.delete(); labels.delete(); centers.delete();
}