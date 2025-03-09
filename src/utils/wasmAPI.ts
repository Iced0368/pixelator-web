import ExampleModule from '../assembly/build/transform.js'

export async function pixelateImageDataWASM
(
    imageData: ImageData, 
    newHeight: number, 
    newWidth: number, 
    threshold: number = 0, 
    sensitivity: number = 0
) 
{
    const height = imageData.height;
    const width = imageData.width;

    const Module = await ExampleModule();

    const srcPtr = Module._malloc(imageData.data.length);
    const outputPtr = Module._malloc(4 * newHeight * newWidth);
    const edgePtr = Module._malloc(imageData.data.length);
    const edgenessPtr = Module._malloc(4 * newHeight * newWidth);

    Module.HEAPU8.set(imageData.data, srcPtr);

    Module._pixelateImageData(
        srcPtr, outputPtr, edgePtr, edgenessPtr,
        imageData.height, imageData.width, 
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
