import cv from 'opencv-ts';
import { convertGrayToRGBA, convertPtrToArray, emphasizeEdge, free, kmeansQuantization, medianResize, Uint8Pointer } from './wasm-wrapper';

export function pixelateImageData(
    imageData: ImageData, 
    newHeight: number, 
    newWidth: number, 
    paletteSize: number,
    threshold: number = 0, 
    sensitivity: number = 0
) {
    const height = imageData.height;
    const width = imageData.width;

    const dataMat = cv.matFromImageData(imageData);
    const edge = new cv.Mat();

    console.time("median");

    const dataPtr = Uint8Pointer(imageData.data);
    const medianPtr = Uint8Pointer(4 * newHeight * newWidth);

    medianResize(
        dataPtr, medianPtr,
        height, width,
        newHeight, newWidth
    );

    console.timeEnd("median");

    console.time("canny");
    
    cv.Canny(dataMat, edge, threshold * 1024, 2*threshold * 1024);

    const edgePtr = Uint8Pointer(Uint8ClampedArray.from(edge.data));
    const edgenessPtr = Uint8Pointer(newHeight * newWidth);

    const edgeRGBAPtr = Uint8Pointer(4 * edge.data.length);
    const edgenessRGBAPtr = Uint8Pointer(4 * newHeight * newWidth);

    convertGrayToRGBA(edgePtr, edgeRGBAPtr, edge.data.length);

    console.timeEnd("canny");

    emphasizeEdge(dataPtr, medianPtr, medianPtr, edgePtr, edgenessPtr, height, width, newHeight, newWidth, sensitivity);
    convertGrayToRGBA(edgenessPtr, edgenessRGBAPtr, newHeight * newWidth);

    const edgeData = convertPtrToArray(edgeRGBAPtr, 4*edge.data.length);
    let resizedData = convertPtrToArray(medianPtr, 4*newHeight*newWidth);
    const edgenessData = convertPtrToArray(edgenessRGBAPtr, 4*newHeight*newWidth);

    const resizedMat = cv.matFromImageData(
        new ImageData(resizedData, newWidth, newHeight)
    );;

    if (paletteSize > 0) {
        console.time("quantize");
        kmeansQuantization(resizedMat, resizedMat, paletteSize);
        resizedData = Uint8ClampedArray.from(resizedMat.data);
        console.timeEnd("quantize");
    }

    dataMat.delete();
    edge.delete();

    free(edgePtr);
    free(edgenessPtr);
    free(edgeRGBAPtr);
    free(edgenessRGBAPtr);

    return {
        output: new ImageData(resizedData, newWidth, newHeight),
        edge: new ImageData(edgeData, width, height),
        edgeness: new ImageData(edgenessData, newWidth, newHeight),
    }
}