import cv from 'opencv-ts';
import { convertGrayToRGBA, convertCArrayToArray, emphasizeEdge, free, medianResize, CArray, kdMeansQuantization } from './wasm-wrapper';

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

    const dataPtr = new CArray(imageData.data);
    const medianPtr = new CArray(4 * newHeight * newWidth);


    medianResize(
        dataPtr, medianPtr,
        height, width,
        newHeight, newWidth
    );

    console.timeEnd("median");

    console.time("canny");
    
    cv.Canny(dataMat, edge, threshold * 1024, 2*threshold * 1024);

    const edgePtr = new CArray(Uint8ClampedArray.from(edge.data));
    const edgenessPtr = new CArray(newHeight * newWidth);

    const edgeRGBAPtr = new CArray(4 * edge.data.length);
    const edgenessRGBAPtr = new CArray(4 * newHeight * newWidth);

    convertGrayToRGBA(edgePtr, edgeRGBAPtr);

    console.timeEnd("canny");

    console.time("emphasize");
    emphasizeEdge(dataPtr, medianPtr, medianPtr, edgePtr, edgenessPtr, height, width, newHeight, newWidth, sensitivity);
    convertGrayToRGBA(edgenessPtr, edgenessRGBAPtr);
    console.timeEnd("emphasize");

    const edgeData = convertCArrayToArray(edgeRGBAPtr);
    let resizedData = convertCArrayToArray(medianPtr);
    const edgenessData = convertCArrayToArray(edgenessRGBAPtr);
    

    if (paletteSize > 0) {
        console.time("quantize");
        kdMeansQuantization(medianPtr, medianPtr, newHeight, newWidth, paletteSize);
        resizedData = convertCArrayToArray(medianPtr);
        console.timeEnd("quantize");
    }

    dataMat.delete();
    edge.delete();

    free(dataPtr);
    free(medianPtr);
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