import cv from 'opencv-ts';
import { convertGrayToRGBA, convertCArrayToArray, emphasizeEdge, free, medianResize, CArray, kdMeansQuantization, dithering } from './transform-wasm-wrapper';

export function pixelateImageData(
    imageData: ImageData,
    paletteData: ImageData | undefined,
    newHeight: number, 
    newWidth: number, 

    paletteSize: number,
    threshold: number, 
    sensitivity: number,

    doDithering: boolean,
) {
    const height = imageData.height;
    const width = imageData.width;

    const dataMat = cv.matFromImageData(imageData);
    const edge = new cv.Mat();

    console.time("median");

    const dataArray = new CArray(imageData.data);
    const medianArray = new CArray(4 * newHeight * newWidth);

    medianResize(
        dataArray, medianArray,
        height, width,
        newHeight, newWidth
    );

    console.timeEnd("median");

    console.time("canny");
    
    cv.Canny(dataMat, edge, threshold * 1024, 2*threshold * 1024);

    const edgeArray = new CArray(Uint8ClampedArray.from(edge.data));
    const edgenessArray = new CArray(newHeight * newWidth);

    const edgeRGBAArray = new CArray(4 * edge.data.length);
    const edgenessRGBAArray = new CArray(4 * newHeight * newWidth);

    convertGrayToRGBA(edgeArray, edgeRGBAArray);

    console.timeEnd("canny");

    console.time("emphasize");
    emphasizeEdge(dataArray, medianArray, medianArray, edgeArray, edgenessArray, height, width, newHeight, newWidth, sensitivity);
    convertGrayToRGBA(edgenessArray, edgenessRGBAArray);
    console.timeEnd("emphasize");

    const edgeData = convertCArrayToArray(edgeRGBAArray);
    const edgenessData = convertCArrayToArray(edgenessRGBAArray);
    let outputData = convertCArrayToArray(medianArray);
    let outputPaletteData = undefined;

    const paletteWidth = 16 * Math.ceil(Math.sqrt(paletteSize) / 16);
    const paletteHeight = Math.ceil(paletteSize / paletteWidth);

    //in
    if (paletteData !== undefined) {
        const paletteArray = new CArray(paletteData.data);
        const quantizedArray = new CArray(medianArray.length);
        
        console.time("quantize");
        kdMeansQuantization(
            medianArray, quantizedArray, 
            newHeight, newWidth, 
            paletteArray, paletteSize, 0
        );
        console.timeEnd("quantize");

        if (doDithering) {
            console.time("dithering");
            dithering(
                medianArray, quantizedArray, 
                newHeight, newWidth, 
                paletteArray, paletteSize
            );
            console.timeEnd("dithering");
        }
        outputData = convertCArrayToArray(quantizedArray);

        free(paletteArray);
        free(quantizedArray);
    }
    //out
    else if (paletteSize > 0) {
        const paletteArray = new CArray(4 * paletteHeight * paletteWidth);
        const quantizedArray = new CArray(medianArray.length);

        console.time("quantize");
        kdMeansQuantization(
            medianArray, quantizedArray, 
            newHeight, newWidth, 
            paletteArray, paletteSize, 1
        );
        console.timeEnd("quantize");

        if (doDithering) {
            console.time("dithering");
            dithering(
                medianArray, quantizedArray, 
                newHeight, newWidth,
                paletteArray, paletteSize
            );
            console.timeEnd("dithering");
        }

        outputData = convertCArrayToArray(quantizedArray);
        outputPaletteData = convertCArrayToArray(paletteArray);
        
        free(paletteArray);
        free(quantizedArray);
    }

    dataMat.delete();
    edge.delete();

    free(dataArray);
    free(medianArray);
    free(edgeArray);
    free(edgenessArray);
    free(edgeRGBAArray);
    free(edgenessRGBAArray);

    return {
        output: new ImageData(outputData, newWidth, newHeight),
        edge: new ImageData(edgeData, width, height),
        edgeness: new ImageData(edgenessData, newWidth, newHeight),
        palette: outputPaletteData ? new ImageData(outputPaletteData, paletteWidth, paletteHeight) : undefined,
    }
}