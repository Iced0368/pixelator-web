import { Canny } from "./canny";

type RGBA = Uint8ClampedArray<ArrayBuffer>;

function rgbaDist(color1: RGBA, color2: RGBA) {
    return color1.reduce((sum, v, i) => sum + Math.abs(v - color2[i]), 0);
}

function getDonimantRGBA(vectors: RGBA[], threshold: number, closeness: number, sensitivity: number) {
    const median: number[] = [];
  
    for (let dim = 0; dim < 4; dim++) {
      const dimValues = vectors.map(v => v[dim]);
      dimValues.sort((a, b) => a - b);
      median.push(dimValues[Math.floor(dimValues.length / 2)]);
    }

    const medianRGBA = Uint8ClampedArray.from(median);

    const sorted = vectors.sort((a, b) => rgbaDist(a, medianRGBA) - rgbaDist(b, medianRGBA));

    const index = closeness > threshold ? Math.floor(
        (sensitivity === 0 ? 0 : Math.pow(closeness, 100 / sensitivity - 1))
            *(sorted.length - 1)
    ) : 0;
    
    return sorted[index];
}

function getGreyScaleImageFromMatrix(input: number[][]) {
    const height = input.length;
    const width = input[0].length;

    const data = Uint8ClampedArray.from({length: 4 * width * height});

    for (let i = 0; i < height; i++)
        for (let j = 0; j < width; j++) {
            data[4 * (i * width + j)] = input[i][j];
            data[4 * (i * width + j) + 1] = input[i][j];
            data[4 * (i * width + j) + 2] = input[i][j];
            data[4 * (i * width + j) + 3] = 255;
        }

    return new ImageData(data, width, height);
}


export function pixelateImageData(imageData: ImageData, newHeight: number, newWidth: number, edgeThreshold: number = 0, edgeSensitivity: number = 0) {
    const height = imageData.height;
    const width = imageData.width;

    const dh = height / newHeight;
    const dw = width / newWidth;
    
    const data = Uint8ClampedArray.from({length: 4 * newHeight * newWidth});
    const sobel = Canny(imageData, edgeThreshold, Math.min(0.8, 2*edgeThreshold));
    const sobelResized = Array.from({length: newHeight}, () => Array.from({length: newWidth}, () => 0));

    for(let h = 0; h < newHeight; h++)
        for(let w = 0; w < newWidth; w++) {
            const cell = [] as Uint8ClampedArray<ArrayBuffer>[];
            let cellSobel = 0;

            for(let i = Math.floor(h*dh); i < Math.floor((h+1)*dh); i++)
                for(let j = Math.floor(w*dw); j < Math.floor((w+1)*dw); j++) {
                    cell.push(imageData.data.slice(4*(i * width + j), 4*(i * width + j + 1)));
                    cellSobel += sobel[i][j];
                    //cellSobel = Math.max(sobel[i][j], cellSobel);
                }

            cellSobel = Math.min(255, cellSobel / (2*Math.sqrt(cell.length)));
            sobelResized[h][w] = cellSobel;

            const representer = getDonimantRGBA(
                cell,
                edgeThreshold,
                cellSobel / 255,
                edgeSensitivity ?? 0,
            );

            for (let i = 0; i < 4; i++)
                data[4*(h * newWidth + w) + i] = representer[i];
        }

    return {
        output: new ImageData(data, newWidth, newHeight),
        edge: getGreyScaleImageFromMatrix(
            sobel.map(array => array.map(x => x < edgeThreshold*255 ? 0 : x))
        ),
        edgeResized: getGreyScaleImageFromMatrix(
            sobelResized.map(array => array.map(x => x < edgeThreshold*255 ? 0 : x))
        )
    };
}