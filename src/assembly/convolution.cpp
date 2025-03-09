#pragma once
#include <cmath>
#define PI 3.14159265358979323846

float* convolution(
    float* input, int inputHeight, int inputWidth,
    float* kernel, int kernelHeight, int kernelWidth,
    bool same
) {
    int padTop = same ? kernelHeight / 2 : 0;
    int padLeft = same ? kernelWidth / 2 : 0;

    int outputHeight, outputWidth;    

    if (same) {
        outputHeight = inputHeight;
        outputWidth = inputWidth;
    }
    else {
        outputHeight = inputHeight - kernelHeight + 1;
        outputWidth = inputWidth - kernelWidth + 1;
    }

    float* output = new float[outputHeight * outputWidth];

    for (int y = 0; y < outputHeight; y++) {
        for (int x = 0; x < outputWidth; x++) {
            output[y * outputWidth + x] = 0;

            for (int ky = 0; ky < kernelHeight; ky++) {
                for (int kx = 0; kx < kernelWidth; kx++) {
                    int _iy = y + ky - padTop;
                    int _ix = x + kx - padLeft;

                    int iy = (_iy < 0) ? 0 : (_iy >= inputHeight ? inputHeight - 1 : _iy);
                    int ix = (_ix < 0) ? 0 : (_ix >= inputWidth ? inputWidth - 1 : _ix);

                    output[y * outputWidth + x] += input[iy * inputWidth + ix] * kernel[ky * kernelWidth + kx];
                }
            }
        }
    }
    return output;
}

float* sobelFilterX(float* input, int height, int width) {
    int kernelHeight = 3, kernelWidth = 3;
    float kernel_x[] = {
        1, 0, -1,
        2, 0, -2,
        1, 0, -1
    };

    int outputHeight, outputWidth;
    float* result = convolution(input, height, width, kernel_x, kernelHeight, kernelWidth, true);
    return result;
}

float* sobelFilterY(float* input, int height, int width) {
    int kernelHeight = 3, kernelWidth = 3;
    float kernel_y[] = {
        1, 2, 1,
        0, 0, 0,
        -1, -2, -1
    };

    int outputHeight, outputWidth;
    float* result = convolution(input, height, width, kernel_y, kernelHeight, kernelWidth, true);
    return result;
}

float* gaussianFilter(float* input, int height, int width, int size, float sigma) {
    float* kernel = new float[size * size];
    float mean = size / 2;
    float sum = 0;

    for (int y = 0; y < size; y++) {
        for (int x = 0; x < size; x++) {
            int dy = y - mean;
            int dx = x - mean;
            float value = std::exp(-(float)(dx * dx + dy * dy) / (2 * sigma * sigma)) / (2 * PI * sigma * sigma);

            kernel[y * size + x] = value;
            sum += value;
        }
    }

    for (int i = 0; i < size * size; i++)
        kernel[i] /= sum;

    float* result = convolution(input, height, width, kernel, size, size, true);

    delete[] kernel;
    return result;
}