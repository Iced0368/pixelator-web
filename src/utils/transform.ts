
/*
export function resizeRgbaArray(rgbaArray: number[][][], newHeight: number, newWidth: number) {
    const height = rgbaArray.length;
    const width = rgbaArray[0].length;

    const dh = height / newHeight;
    const dw = width / newWidth;
    
    const result = Array.from({length: newHeight}, () => Array.from({length: newWidth})) as number[][][];

    for(let h = 0; h < newHeight; h++)
        for(let w = 0; w < newWidth; w++)
            result[h][w] = interpolateRGBA(rgbaArray, h*dh, w*dw);

    return result;
}
*/

import { Sobel } from "./sobel";

function getDonimantRGBA(vectors: Uint8ClampedArray<ArrayBuffer>[]) {
    const medianVector: number[] = [];
  
    for (let dim = 0; dim < 4; dim++) {
      const dimValues = vectors.map(v => v[dim]);
      dimValues.sort((a, b) => a - b);
      medianVector.push(dimValues[Math.floor(dimValues.length / 2)]);
    }

    let closestVector = vectors[0];
    let minmaxDistance = vectors[0].reduce((sum, v, i) => sum + Math.abs(v - medianVector[i]), 0);

    for (const vector of vectors) {
        const distance = vector.reduce((sum, v, i) => sum + Math.abs(v - medianVector[i]), 0);
        if (distance < minmaxDistance) {
            minmaxDistance = distance;
            closestVector = vector;
        }
    }

    return closestVector;
}

function getMeanRGBA(vectors: Uint8ClampedArray<ArrayBuffer>[]) {
    const rgbSum = [0, 0, 0];

    let aSum = 0;

    for(const rgba of vectors) {
        const [r, g, b, a] = rgba;
        rgbSum[0] += r * a;
        rgbSum[1] += g * a;
        rgbSum[2] += b * a;
        aSum += a;
    }

    return Uint8ClampedArray.from([...rgbSum.map(x => Math.floor(x / aSum)), aSum / vectors.length]);
}

function getEdge(imageData: ImageData) {
    const sobel = Sobel(imageData);
    const sobelX = sobel.horiziontal.flat();
    const sobelY = sobel.vertical.flat();

    return sobelX.map((x, i) => Math.max(x, sobelY[i]));
}


export function pixelateImageData(imageData: ImageData, newHeight: number, newWidth: number, edgeThreshold?: number) {
    const height = imageData.height;
    const width = imageData.width;

    const dh = height / newHeight;
    const dw = width / newWidth;
    
    const data = Uint8ClampedArray.from({length: 4 * newHeight * newWidth});
    const sobel = getEdge(imageData);

    for(let h = 0; h < newHeight; h++)
        for(let w = 0; w < newWidth; w++) {
            const cell = [] as Uint8ClampedArray<ArrayBuffer>[];
            let cellSobel = 0;

            for(let i = Math.floor(h*dh); i < Math.floor((h+1)*dh); i++)
                for(let j = Math.floor(w*dw); j < Math.floor((w+1)*dw); j++) {
                    cell.push(imageData.data.slice(4*(i * width + j), 4*(i * width + j + 1)));
                    cellSobel = Math.max(cellSobel, sobel[i * width + j]);
                }

            const dominant = getDonimantRGBA(cell);

            const representer = edgeThreshold !== undefined && cellSobel > edgeThreshold ?
                [...getMeanRGBA(cell), dominant[3]] : dominant;

            for (let i = 0; i < 4; i++)
                data[4*(h * newWidth + w) + i] = representer[i];
        }

    return new ImageData(data, newWidth, newHeight);
}

export function getEdgeFromImageData(imageData: ImageData, edgeThreshold: number) {
    const sobel = getEdge(imageData);
    const data = Uint8ClampedArray.from({length: imageData.data.length});

    sobel.forEach((x, i) => {
        const val = x > edgeThreshold ? 255 : 0;
        data[4 * i] = val;
        data[4 * i + 1] = val;
        data[4 * i + 2] = val;
        data[4 * i + 3] = 255;
    })

    return new ImageData(data, imageData.width, imageData.height);
}