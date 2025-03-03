const kernel_x = [
    [1, 0, -1],
    [2, 0, -2],
    [1, 0, -1],
];

const kernel_y = [
    [1, 2, 1],
    [0, 0, 0],
    [-1, -2, -1],
];

export function Sobel(imageData: ImageData) {
    const height = imageData.height;
    const width = imageData.width;

    const gradientX = Array.from({length: height}, () => Array.from({length: width}, () => [0, 0, 0, 0]));
    const gradientY = Array.from({length: height}, () => Array.from({length: width}, () => [0, 0, 0, 0]));

    for (let h = 0; h < imageData.height; h++)
        for (let w = 0; w < imageData.width; w++) {
            const rgba = [
                imageData.data[4*(h * width + w)],
                imageData.data[4*(h * width + w) + 1],
                imageData.data[4*(h * width + w) + 2],
                imageData.data[4*(h * width + w) + 3],
            ];

            for (let i = -1; i <= 1; i++)
                for (let j = -1; j <= 1; j++) {
                    if (h + i < 0 || h + i >= height || w + j < 0 || w + j >= width)
                        continue;

                    for (let c = 0; c < 4; c++) {
                        gradientX[h + i][w + j][c] += rgba[c] * kernel_x[i + 1][j + 1];
                        gradientY[h + i][w + j][c] += rgba[c] * kernel_y[i + 1][j + 1];
                    }
                }
        }

        function normalize(gradient: number[][]) {
            const maxValue = gradient.reduce((maxValue, row) => row.reduce((acc, val) => Math.max(acc, val), maxValue), 0);
            return gradient.map(row => row.map(x => x / maxValue));
        }
    
    return {
        horiziontal: normalize(gradientX.map(row => row.map(rgb => rgb.reduce((acc, val) => acc + Math.abs(val), 0)))),
        vertical: normalize(gradientY.map(row => row.map(rgb => rgb.reduce((acc, val) => acc + Math.abs(val), 0)))),
    };
}