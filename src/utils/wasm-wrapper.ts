//@ts-ignore
import TransformModule from '../assembly/build/transform.js'

type TransformModule = WebAssembly.Module & {
    HEAPU8: any,
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
        height: number, width: number, 
        palette: number, k: number,
        mode: number,
    ) => void,
    _dithering: (
        src: number, dst: number,
        height: number, width: number, 
        palette: number, palette_size: number,
    ) => void
};

let Module: TransformModule;
TransformModule().then((res: TransformModule) => Module = res);

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
    height: number, width: number, 
    palette: CArray, palette_size: number,
    mode: number,
) {
    Module._kdMeansQuantization(
        src.ptr, dst.ptr, 
        height, width, 
        palette.ptr, palette_size,
        mode,
    );
}

export function dithering(
    src: CArray, dst: CArray,
    height: number, width: number,
    palette: CArray, palette_size: number,
) {
    Module._dithering(
        src.ptr, dst.ptr,
        height, width, 
        palette.ptr, palette_size
    );
}