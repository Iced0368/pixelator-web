import cv from 'opencv-ts';
import { convertGrayToRGBA, convertCArrayToArray, emphasizeEdge, free, medianResize, CArray, kdMeansQuantization, dithering, superPixel, removeBorder } from './transform-wasm-wrapper';

export function pixelateImageDataHeavy(
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

    const tmpHeight = 4 * newHeight;
    const tmpWidth = 4 * newWidth;

    const dataArray = new CArray(imageData.data);
    const resizedArray = new CArray(4 * newHeight * newWidth);
    let tmpDataArray = undefined;

    if (tmpHeight < height && tmpWidth < width) {
        tmpDataArray = new CArray(4 * tmpHeight * tmpWidth);
        medianResize(
            dataArray, tmpDataArray,
            height, width,
            tmpHeight, tmpWidth
        );
    }

    console.time("resize");
    if (tmpDataArray) {
        const tmpNoBorderArray = new CArray(4 * tmpHeight * tmpWidth);
        removeBorder(
            tmpDataArray, tmpNoBorderArray,
            tmpHeight, tmpWidth
        );
        superPixel(
            tmpNoBorderArray, resizedArray,
            tmpHeight, tmpWidth,
            newHeight, newWidth
        );
        free(tmpDataArray);
        free(tmpNoBorderArray);
    }
    else
        medianResize(
            dataArray, resizedArray,
            height, width,
            newHeight, newWidth
        ); 
    console.timeEnd("resize");

    console.time("canny");

    const dataMat = cv.matFromImageData(imageData);
    const edge = new cv.Mat();
    cv.Canny(dataMat, edge, threshold * 1024, 2*threshold * 1024);

    const edgeArray = new CArray(Uint8ClampedArray.from(edge.data));
    const edgenessArray = new CArray(newHeight * newWidth);

    const edgeRGBAArray = new CArray(4 * edge.data.length);
    const edgenessRGBAArray = new CArray(4 * newHeight * newWidth);

    convertGrayToRGBA(edgeArray, edgeRGBAArray);

    console.timeEnd("canny");

    console.time("emphasize");
    emphasizeEdge(dataArray, resizedArray, resizedArray, edgeArray, edgenessArray, height, width, newHeight, newWidth, sensitivity);
    convertGrayToRGBA(edgenessArray, edgenessRGBAArray);
    console.timeEnd("emphasize");

    const edgeData = convertCArrayToArray(edgeRGBAArray);
    const edgenessData = convertCArrayToArray(edgenessRGBAArray);
    let outputData = convertCArrayToArray(resizedArray);
    let outputPaletteData = undefined;

    const paletteWidth = 16 * Math.ceil(Math.sqrt(paletteSize) / 16);
    const paletteHeight = Math.ceil(paletteSize / paletteWidth);

    //in
    if (paletteData !== undefined) {
        const paletteArray = new CArray(paletteData.data);
        const quantizedArray = new CArray(resizedArray.length);
        
        console.time("quantize");
        kdMeansQuantization(
            resizedArray, quantizedArray, 
            newHeight, newWidth, 
            paletteArray, paletteSize, 0
        );
        console.timeEnd("quantize");

        if (doDithering) {
            console.time("dithering");
            dithering(
                resizedArray, quantizedArray, 
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
        const quantizedArray = new CArray(resizedArray.length);

        console.time("quantize");
        kdMeansQuantization(
            resizedArray, quantizedArray, 
            newHeight, newWidth, 
            paletteArray, paletteSize, 1
        );
        console.timeEnd("quantize");

        if (doDithering) {
            console.time("dithering");
            dithering(
                resizedArray, quantizedArray, 
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
    free(resizedArray);
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


    const dataArray = new CArray(imageData.data);
    const medianArray = new CArray(4 * newHeight * newWidth);

    console.time("resize");
    medianResize(
        dataArray, medianArray,
        height, width,
        newHeight, newWidth
    );

    console.timeEnd("resize");

    console.time("canny");

    const dataMat = cv.matFromImageData(imageData);
    const edge = new cv.Mat();
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