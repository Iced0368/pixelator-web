import { gaussianFilter, sobelFilterX, sobelFilterY } from "./convolution";

function getGreyScale(imageData: ImageData) {
    const height = imageData.height;
    const width = imageData.width;

    const greyScale: number[][] = Array.from({length: height}, () => Array.from({length: width}));

    for (let h = 0; h < imageData.height; h++)
        for (let w = 0; w < imageData.width; w++) {
            const rgba = [
                imageData.data[4*(h * width + w)],
                imageData.data[4*(h * width + w) + 1],
                imageData.data[4*(h * width + w) + 2],
                imageData.data[4*(h * width + w) + 3],
            ];

            greyScale[h][w] = Math.floor((0.3*rgba[0] + 0.59*rgba[1] + 0.11*rgba[2]) * rgba[3] / 255);
        }
    
    return greyScale;
}


function hysteresisThresholding(gradient: number[][], lowThreshold: number, highThreshold: number) {
    const height = gradient.length;
    const width = gradient[0].length;

    let edges = Array.from({ length: height }, () => Array(width).fill(0));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (gradient[y][x] >= highThreshold * 255) {
                edges[y][x] = 2; // Strong Edge
            } 
            else if (gradient[y][x] >= lowThreshold * 255) {
                edges[y][x] = 1; // Weak Edge
            }
        }
    }

    function connectWeakEdges(y: number, x: number) {
        let stack = [[y, x]];
        while (stack.length > 0) {
            let [cy, cx] = stack.pop() as number[];
            edges[cy][cx] = 2;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    let ny = cy + dy, nx = cx + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && edges[ny][nx] === 1) {
                        stack.push([ny, nx]);
                    }
                }
            }
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (edges[y][x] === 2) {
                connectWeakEdges(y, x);
            }
        }
    }

    return edges.map(row => row.map(val => (val >= 2 ? 255 : 0)));
}

export function Canny(imageData: ImageData, lowThreshold: number, highThreshold: number) {
    const height = imageData.height;
    const width = imageData.width;

    const greyScale = getGreyScale(imageData);

    const greyScaleBlurred = gaussianFilter(greyScale, 5, 2);
    
    const gradientX = sobelFilterX(greyScaleBlurred);
    const gradientY = sobelFilterY(greyScaleBlurred);

    function normalize(gradient: number[][]) {
        const maxValue = gradient.reduce((maxValue, row) => row.reduce((acc, val) => Math.max(acc, Math.abs(val)), maxValue), 0);
        return gradient.map(row => row.map(x => Math.abs(x) / maxValue * 255));
    }

    const gradient = normalize(gradientX.map((gradientX_i, i) => gradientX_i.map((x, j) => Math.sqrt(x*x + gradientY[i][j]*gradientY[i][j]))));

    const supressed: number[][] = [];

    const di = [0, 1, 1, 1, 0, -1, -1, -1];
    const dj = [1, 1, 0, -1, -1, -1, 0, 1];

    for (let i = 0; i < height; i++) {
        supressed[i] = [];
        for (let j = 0; j < width; j++) {
            function getGradientIndex(_row: number, _col: number) {
                const row = Math.min(Math.max(_row, 0), height - 1);
                const col = Math.min(Math.max(_col, 0), width - 1);
                return gradient[row][col];
            }

            const degree = Math.atan2(gradientY[i][j], gradientX[i][j]) * 180 / Math.PI;
            const region = Math.round((degree + 180) / 45) % 8;
            
            const left = getGradientIndex(i + di[region], j + dj[region]);
            const right = getGradientIndex(i - di[region], j - dj[region]);

            if (gradient[i][j] > left && gradient[i][j] > right)
                supressed[i][j] = gradient[i][j];
            else
                supressed[i][j] = 0;
        }
    }

    console.log(lowThreshold, highThreshold)
    const result = hysteresisThresholding(supressed, lowThreshold, highThreshold)

    return result;
}