import { Canny } from "./canny";
import { getMedian, KMeans, KMedians } from "./kmeans";
import { VectorUtils as vu, type Vector } from "./vector";

type RGBA = Vector<4>;

function colorDistance(color1: RGBA, color2: RGBA) {
    return vu.l1norm([
        color1[0]*color1[3] - color2[0]*color2[3],
        color1[1]*color1[3] - color2[1]*color2[3],
        color1[2]*color1[3] - color2[2]*color2[3],
    ]);
}

function getClosestColor(colors: RGBA[], target: RGBA) {
    return colors.reduce((closest, current) => 
        colorDistance(current, target) < colorDistance(closest, target) ? current : closest
    );
}

function getDonimantColor(colors: RGBA[], edgeColors: RGBA[], closeness: number, sensitivity: number) {
    const medianColor = getMedian(colors, colorDistance);
    const medianComplementary = [
        255 - medianColor[0], 
        255 - medianColor[1], 
        255 - medianColor[2], 
        medianColor[3]
    ] as RGBA;

    if (edgeColors.length) {
        const edgeColor = getClosestColor(colors, medianComplementary);
        const t = sensitivity === 0 ? 0 : Math.pow(closeness, 100 / sensitivity - 1);

        const target = medianColor.map((v, i) => (1-t)*v + t*edgeColor[i]) as RGBA;
        return getClosestColor(colors, target);
    }
    else
        return medianColor;
}

function getGreyScaleImageFromMatrix(input: number[][]) {
    const height = input.length;
    const width = input[0].length;

    const data = Uint8ClampedArray.from({length: 4 * width * height});

    for (let i = 0; i < height; i++)
        for (let j = 0; j < width; j++) {
            const val = Math.floor(255 * input[i][j]);
            data[4 * (i * width + j)] = val;
            data[4 * (i * width + j) + 1] = val;
            data[4 * (i * width + j) + 2] = val;
            data[4 * (i * width + j) + 3] = 255;
        }

    return new ImageData(data, width, height);
}

export function pixelateImageData
(
    imageData: ImageData, 
    newHeight: number, 
    newWidth: number, 
    edgeThreshold: number = 0, 
    edgeSensitivity: number = 0
) 
{
    const height = imageData.height;
    const width = imageData.width;

    const dh = height / newHeight;
    const dw = width / newWidth;
    
    const canny = Canny(imageData, edgeThreshold / 2, edgeThreshold);

    const cellColors = Array.from({length: newHeight}, () => Array.from({length: newWidth}, () => <RGBA[]>[]));
    const cellEdgeColors = Array.from({length: newHeight}, () => Array.from({length: newWidth}, () => <RGBA[]>[]));
    let edgeness = Array.from({length: newHeight}, () => Array(newWidth).fill(0));

    for(let h = 0; h < newHeight; h++)
        for(let w = 0; w < newWidth; w++) {
            for(let i = Math.floor(h*dh); i < Math.floor((h+1)*dh); i++)
                for(let j = Math.floor(w*dw); j < Math.floor((w+1)*dw); j++) {
                    const rgba = Array.from(imageData.data.slice(4*(i * width + j), 4*(i * width + j + 1))) as RGBA;
                    cellColors[h][w].push(rgba);

                    if (canny[i][j]) {
                        edgeness[h][w]++;
                        
                        cellEdgeColors[h][w].push(rgba);
                    }
                }
            edgeness[h][w] /= cellColors[h][w].length;
        }

    function normalize(gradient: number[][], threshold: number) {
        const maxValue = gradient.reduce((maxValue, row) => row.reduce((acc, val) => Math.max(acc, Math.abs(val)), maxValue), 0);
        return gradient.map(row => row.map(x => {
            const val = Math.abs(x) / maxValue;
            return val < threshold ? 0 : val;
        }));
    }
    edgeness = normalize(edgeness, edgeThreshold);

    const representers: RGBA[] = [];

    for(let h = 0; h < newHeight; h++)
        for(let w = 0; w < newWidth; w++) {
            const representer = getDonimantColor(
                cellColors[h][w], cellEdgeColors[h][w], edgeness[h][w],
                edgeSensitivity ?? 0,
            );
            representers.push(representer);
        }
    
    /*
    const kmeans = new KMeans(32, representers, colorDistance);

    const data = Uint8ClampedArray.from(
        representers.map(v => kmeans.findCluster(v).map(x => Math.floor(x))).flat()
    );
    */
    const data = Uint8ClampedArray.from(representers.flat());

    return {
        output: new ImageData(data, newWidth, newHeight),
        edge: getGreyScaleImageFromMatrix(canny),
        edgeness: getGreyScaleImageFromMatrix(edgeness),
    };
}