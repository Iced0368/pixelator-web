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

    const greyScale: number[] = Array.from({length: height * width});

    const gradientX = Array.from({length: height}, () => Array.from({length: width}, () => 0));
    const gradientY = Array.from({length: height}, () => Array.from({length: width}, () => 0));

    for (let h = 0; h < imageData.height; h++)
        for (let w = 0; w < imageData.width; w++) {
            const rgba = [
                imageData.data[4*(h * width + w)],
                imageData.data[4*(h * width + w) + 1],
                imageData.data[4*(h * width + w) + 2],
                imageData.data[4*(h * width + w) + 3],
            ];

            greyScale[h * width + w] = Math.floor((0.3*rgba[0] + 0.59*rgba[1] + 0.11*rgba[2]) * rgba[3] / 255);

            for (let i = -1; i <= 1; i++)
                for (let j = -1; j <= 1; j++) {
                    if (h + i < 0 || h + i >= height || w + j < 0 || w + j >= width)
                        continue;

                    gradientX[h + i][w + j] += greyScale[h * width + w] * kernel_x[i + 1][j + 1];
                    gradientY[h + i][w + j] += greyScale[h * width + w] * kernel_y[i + 1][j + 1];
                }
        }

        function normalize(gradient: number[][]) {
            const maxValue = gradient.reduce((maxValue, row) => row.reduce((acc, val) => Math.max(acc, Math.abs(val)), maxValue), 0);
            return gradient.map(row => row.map(x => Math.abs(x) / maxValue));
        }
    
    return {
        horiziontal: normalize(gradientX),
        vertical: normalize(gradientY),
    };
}