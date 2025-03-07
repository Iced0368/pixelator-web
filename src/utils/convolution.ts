export function convolution(
    input: number[][], 
    kernel: number[][], 
    padding: "valid" | "same" = "valid"
): number[][] {
    const inputHeight = input.length;
    const inputWidth = input[0].length;
    const kernelHeight = kernel.length;
    const kernelWidth = kernel[0].length;

    const padTop = Math.floor(kernelHeight / 2);
    const padLeft = Math.floor(kernelWidth / 2);

    const outputHeight = padding === "same" ? inputHeight : inputHeight - kernelHeight + 1;
    const outputWidth = padding === "same" ? inputWidth : inputWidth - kernelWidth + 1;
    const output = Array.from({ length: outputHeight }, () => Array(outputWidth).fill(0));

    for (let y = 0; y < outputHeight; y++) {
        for (let x = 0; x < outputWidth; x++) {
            output[y][x] = 0;

            for (let ky = 0; ky < kernelHeight; ky++) {
                for (let kx = 0; kx < kernelWidth; kx++) {
                    const _iy = y + ky - (padding === "same" ? padTop : 0);
                    const _ix = x + kx - (padding === "same" ? padLeft : 0);

                    const iy = Math.min(Math.max(0, _iy), inputHeight - 1);
                    const ix = Math.min(Math.max(0, _ix), inputWidth - 1);

                    output[y][x] += input[iy][ix] * kernel[ky][kx];
                }
            }
        }
    }

    return output;
}

export function sobelFilterX(input: number[][]) {
    const kernel_x = [
        [1, 0, -1],
        [2, 0, -2],
        [1, 0, -1],
    ];
    const gradientX = convolution(input, kernel_x, "same");
    return gradientX;
}

export function sobelFilterY(input: number[][]) {
    const kernel_y = [
        [1, 2, 1],
        [0, 0, 0],
        [-1, -2, -1],
    ];
    const gradientY = convolution(input, kernel_y, "same");
    return gradientY;
}

export function gaussianFilter(input: number[][], size: number, sigma: number) {
    const kernel: number[][] = [];
    const mean = Math.floor(size / 2);
    let sum = 0;

    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const dy = y - mean;
            const dx = x - mean;
            const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) / (2 * Math.PI * sigma * sigma);
            kernel[y][x] = value;
            sum += value;
        }
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            kernel[y][x] /= sum;
        }
    }

    return convolution(input, kernel, "same");
}