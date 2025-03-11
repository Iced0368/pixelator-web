import cv, { type Mat } from 'opencv-ts';
import TransformModule from '../assembly/build/transform.js'

export async function pixelateImageDataWASM
(
    imageData: ImageData, 
    newHeight: number, 
    newWidth: number, 
    paletteSize: number,
    threshold: number = 0, 
    sensitivity: number = 0
) 
{
    const height = imageData.height;
    const width = imageData.width;

    const Module = await TransformModule();

    const srcPtr = Module._malloc(imageData.data.length);
    const outputPtr = Module._malloc(4 * newHeight * newWidth);
    const edgePtr = Module._malloc(imageData.data.length);
    const edgenessPtr = Module._malloc(4 * newHeight * newWidth);

    Module.HEAPU8.set(imageData.data, srcPtr);

    Module._pixelateImageData(
        srcPtr, outputPtr, edgePtr, edgenessPtr,
        imageData.height, imageData.width, paletteSize,
        newHeight, newWidth, 
        threshold, sensitivity
    );

    const pixelatedData = new Uint8ClampedArray(4 * newHeight * newWidth);
    const edgeData = new Uint8ClampedArray(height * width);
    const edgenessData = new Uint8ClampedArray(newHeight * newWidth);
    
    pixelatedData.set(Module.HEAPU8.subarray(outputPtr, outputPtr + pixelatedData.length));
    edgeData.set(Module.HEAPU8.subarray(edgePtr, edgePtr + edgeData.length));
    edgenessData.set(Module.HEAPU8.subarray(edgenessPtr, edgenessPtr + edgenessData.length));
    
    Module._free(srcPtr);
    Module._free(outputPtr);
    Module._free(edgePtr);
    Module._free(edgenessPtr);

    const _edgeData = Uint8ClampedArray.from(Array.from(edgeData).map(x => [x, x, x, 255]).flat());
    const _edgenessData = Uint8ClampedArray.from(Array.from(edgenessData).map(x => [x, x, x, 255]).flat());

    return {
        output: new ImageData(pixelatedData, newWidth, newHeight),
        edge: new ImageData(_edgeData, width, height),
        edgeness: new ImageData(_edgenessData, newWidth, newHeight),
    };
}

const Module: WebAssembly.Module & {
    _malloc: (length: number) => Uint8Pointer,
    _free: (length: number) => Uint8Pointer,
    _medianResize: (
        src: Uint8Pointer, dst: Uint8Pointer, 
        height: number, width: number,
        newHeight: number, newWidth: number, 
    ) => void,
    _convertGrayToRGBA: (src: Uint8Pointer, dst: Uint8Pointer, length: number) => void,
    _emphasizeEdge: (
        srcPtr: Uint8Pointer, dstPtr: Uint8Pointer, imgPtr: Uint8Pointer, 
        edgePtr: Uint8Pointer, edgenessPtr: Uint8Pointer,
        height: number, width: number,
        newHeight: number, newWidth: number, 
        sensitivity: number
    ) => void,
}
= await TransformModule();

export type Uint8Pointer = any;
export function Uint8Pointer(length: number): Uint8Pointer;
export function Uint8Pointer(array: Uint8ClampedArray): Uint8Pointer;

export function Uint8Pointer(arg: number | Uint8ClampedArray) {
    if (typeof arg === 'number') {
        const ptr: Uint8Pointer = Module._malloc(arg);
        return ptr;
    }
    else {
        const ptr: Uint8Pointer = Module._malloc(arg.length);
        Module.HEAPU8.set(arg, ptr);
        return ptr;
    }
}
export function free(ptr: Uint8Pointer) {
    Module._free(ptr);
}

export function convertPtrToArray(ptr: Uint8Pointer, length: number) {
    const array = new Uint8ClampedArray(length);
    array.set(Module.HEAPU8.subarray(ptr, ptr + length));
    return array;
}

export function medianResize
(
    srcPtr: Uint8Pointer, dstPtr:Uint8Pointer,
    height: number, width: number,
    newHeight: number, newWidth: number, 
) 
{
    Module._medianResize(
        srcPtr, dstPtr,
        height, width,
        newHeight, newWidth, 
    );
}

export function convertGrayToRGBA(
    srcPtr: Uint8Pointer, dstPtr: Uint8Pointer, length: number
) {
    Module._convertGrayToRGBA(srcPtr, dstPtr, length);
}

export function emphasizeEdge(
    srcPtr: Uint8Pointer, dstPtr: Uint8Pointer, imgPtr: Uint8Pointer, 
    edgePtr: Uint8Pointer, edgenessPtr: Uint8Pointer,
    height: number, width: number,
    newHeight: number, newWidth: number, 
    sensitivity: number
) {
    Module._emphasizeEdge(
        srcPtr, dstPtr, imgPtr, edgePtr, edgenessPtr,
        height, width, newHeight, newWidth, 
        sensitivity
    );
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

    const channels = centers8U.cols;

    for (let i = 0; i < N; i++)
        for (let channel = 0; channel < channels; channel++) {
            
            dstMat.data[i * channels + channel] = centers8U.ucharAt(
                labels.intAt(i), channel
            );
        }

    console.timeEnd("label");

    samples.delete(); labels.delete(); centers.delete();
}