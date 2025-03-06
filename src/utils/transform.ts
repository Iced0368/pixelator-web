
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

type RGBA = Uint8ClampedArray<ArrayBuffer>;

function rgbaDist(color1: RGBA, color2: RGBA) {
    return color1.reduce((sum, v, i) => sum + Math.abs(v - color2[i]), 0);
}

function getDonimantRGBA(vectors: RGBA[], closeness: number, sensitivity: number) {
    const median: number[] = [];
  
    for (let dim = 0; dim < 4; dim++) {
      const dimValues = vectors.map(v => v[dim]);
      dimValues.sort((a, b) => a - b);
      median.push(dimValues[Math.floor(dimValues.length / 2)]);
    }

    const medianRGBA = Uint8ClampedArray.from(median);

    const sorted = vectors.sort((a, b) => rgbaDist(a, medianRGBA) - rgbaDist(b, medianRGBA));

    /*
    let result = vectors[0];
    let minmaxDistance = nearest ? Infinity : 0;

    for (const vector of vectors) {
        const distance = rgbaDist(vector, Uint8ClampedArray.from(medianVector));
        if (nearest === (distance < minmaxDistance)) {
            minmaxDistance = distance;
            result = vector;
        }
    }

    return result;
    */
    //console.log(closeness, sorted.length, Math.floor(closeness * (sorted.length - 1)))
    const index = Math.floor(
        (sensitivity === 0 ? 0 : Math.pow(closeness, 100 / sensitivity - 1))
            *(sorted.length - 1)
    );
    
    return sorted[index];
}

function getMeanRGBA(vectors: RGBA[]) {
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

function getEdgeImageFromSobel(sobel: number[], width:number, height:number, edgeThreshold: number) {
    const data = Uint8ClampedArray.from({length: 4 * width * height});

    sobel.forEach((x, i) => {
        const val = x > edgeThreshold ? 255 : 0;
        data[4 * i] = val;
        data[4 * i + 1] = val;
        data[4 * i + 2] = val;
        data[4 * i + 3] = 255;
    })

    return new ImageData(data, width, height);
}


export function pixelateImageData(imageData: ImageData, newHeight: number, newWidth: number, edgeThreshold?: number, edgeSensitivity?: number) {
    const height = imageData.height;
    const width = imageData.width;

    const dh = height / newHeight;
    const dw = width / newWidth;
    
    const data = Uint8ClampedArray.from({length: 4 * newHeight * newWidth});
    const sobel = getEdge(imageData);
    const sobelResized: number[] = [];

    console.log(edgeThreshold, edgeSensitivity)

    for(let h = 0; h < newHeight; h++)
        for(let w = 0; w < newWidth; w++) {
            const cell = [] as Uint8ClampedArray<ArrayBuffer>[];
            let cellSobel = 0;

            for(let i = Math.floor(h*dh); i < Math.floor((h+1)*dh); i++)
                for(let j = Math.floor(w*dw); j < Math.floor((w+1)*dw); j++) {
                    cell.push(imageData.data.slice(4*(i * width + j), 4*(i * width + j + 1)));
                    cellSobel += sobel[i * width + j];
                }

            cellSobel /= cell.length;
            sobelResized.push(cellSobel);

            const representer = getDonimantRGBA(
                cell,
                cellSobel < (edgeThreshold ?? 0) ? 0 : cellSobel,
                edgeSensitivity ?? 0,
            );

            /*
            const dominant = getDonimantRGBA(cell);

            const representer = edgeThreshold !== undefined && cellSobel > edgeThreshold ?
                [...getMeanRGBA(cell), dominant[3]] : dominant;
            */

            for (let i = 0; i < 4; i++)
                data[4*(h * newWidth + w) + i] = representer[i];
        }

    return {
        output: new ImageData(data, newWidth, newHeight),
        edge: getEdgeImageFromSobel(sobel, width, height, edgeThreshold ?? 1),
        edgeResized: getEdgeImageFromSobel(sobelResized, newWidth, newHeight, edgeThreshold ?? 1)
    };
}