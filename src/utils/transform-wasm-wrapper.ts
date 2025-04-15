//@ts-ignore
import Module from '../assembly/build/transform.js'

function EnsureModuleInitialized(target: any, propertyKey: string) {
    target[propertyKey] = function(...args: any[]) {
        if (this._module === undefined) {
            throw new Error(`${propertyKey} cannot be called because _module is not initialized.`);
        }
        return this._module[propertyKey](...args);
    };
}

class TransformModule {
    static _module: any = undefined;

    @EnsureModuleInitialized
    static get HEAPU8() { return this._module.HEAPU8; };
    static set HEAPU8(_) {};

    @EnsureModuleInitialized 
    static _free: (length: number) => void;

    @EnsureModuleInitialized 
    static _malloc: (length: number) => number;

    @EnsureModuleInitialized 
    static _medianResize: (
        srcPtr: number, dstPtr: number, 
        height: number, width: number,
        newHeight: number, newWidth: number, 
    ) => void;

    @EnsureModuleInitialized 
    static _convertGrayToRGBA: (srcPtr: number, dstPtr: number, length: number) => void;

    @EnsureModuleInitialized 
    static _emphasizeEdge: (
        srcPtr: number, dstPtr: number, imgPtr: number, 
        edgePtr: number, edgenessPtr: number,
        height: number, width: number,
        newHeight: number, newWidth: number, 
        sensitivity: number
    ) => void;

    @EnsureModuleInitialized 
    static _kdMeansQuantization: (
        src: number, dst: number,
        height: number, width: number, 
        palette: number, k: number,
        mode: number,
    ) => void;

    @EnsureModuleInitialized 
    static _dithering: (
        src: number, dst: number,
        height: number, width: number, 
        palette: number, palette_size: number,
    ) => void

    @EnsureModuleInitialized 
    static _superPixel: (
        srcPtr: number, dstPtr: number, 
        height: number, width: number,
        newHeight: number, newWidth: number, 
    ) => void;

    @EnsureModuleInitialized 
    static _removeBorder: (
        srcPtr: number, dstPtr: number, 
        height: number, width: number,
    ) => void;
};

Module().then((module: any) => {
    TransformModule._module = module;
});

export class CArray { 
    ptr: number;
    length: number;

    constructor(arg: number | Uint8ClampedArray | undefined) {
        if (arg === undefined) {
            this.ptr = 0;
            this.length = 0;
        }
        else if (typeof arg === 'number') {
            this.ptr = TransformModule._malloc(arg);
            this.length = arg;
        }
        else {
            const ptr = TransformModule._malloc(arg.length);
            TransformModule.HEAPU8.set(arg, ptr);
            this.ptr = ptr;
            this.length = arg.length;
        }
    }
};

export function free(cArray: CArray) {
    TransformModule._free(cArray.ptr);
}

export function convertCArrayToArray(cArray: CArray) {
    const array = new Uint8ClampedArray(cArray.length);
    array.set(TransformModule.HEAPU8.subarray(cArray.ptr, cArray.ptr + cArray.length));
    return array;
}

export function medianResize
(
    src: CArray, dst:CArray,
    height: number, width: number,
    newHeight: number, newWidth: number, 
) 
{
    TransformModule._medianResize(
        src.ptr, dst.ptr,
        height, width,
        newHeight, newWidth, 
    );
}

export function convertGrayToRGBA(
    src: CArray, dst: CArray
) {
    TransformModule._convertGrayToRGBA(src.ptr, dst.ptr, src.length);
}

export function emphasizeEdge(
    src: CArray, dst: CArray, img: CArray, 
    edge: CArray, edgeness: CArray,
    height: number, width: number,
    newHeight: number, newWidth: number, 
    sensitivity: number
) {
    TransformModule._emphasizeEdge(
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
    TransformModule._kdMeansQuantization(
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
    TransformModule._dithering(
        src.ptr, dst.ptr,
        height, width, 
        palette.ptr, palette_size
    );
}

export function superPixel
(
    src: CArray, dst:CArray,
    height: number, width: number,
    newHeight: number, newWidth: number, 
) 
{
    TransformModule._superPixel(
        src.ptr, dst.ptr,
        height, width,
        newHeight, newWidth, 
    );
}

export function removeBorder
(
    src: CArray, dst:CArray,
    height: number, width: number,
) 
{
    TransformModule._removeBorder(
        src.ptr, dst.ptr,
        height, width,
    );
}