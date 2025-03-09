#include <stack>
#include "rgba.cpp"
#include "convolution.cpp"
#define PI 3.14159265358979323846

float* getGreyScale(uint8_t* src, int height, int width) {
    float* greyScale = new float[height * width];
    for(int i = 0; i < height * width; i++)
        greyScale[i] = RGBA(
            src[4 * i], src[4 * i + 1], src[4 * i + 2], src[4 * i + 3]
        ).norm();

    return greyScale;
}

float* edgeThinning(float* gradientX, float* gradientY, int height, int width) {
    float* gradient = new float[height * width];
    float* result = new float[height * width];

    for(int i = 0; i < height * width; i++)
        gradient[i] = std::sqrt(gradientX[i]*gradientX[i] + gradientY[i]*gradientY[i]);

    int di[] = {0, 1, 1, 1, 0, -1, -1, -1};
    int dj[] = {1, 1, 0, -1, -1, -1, 0, 1};

    for (int i = 0; i < height; i++)
        for (int j = 0; j < width; j++) {
            auto getGradientIndex = [&](int row, int col) {
                row = std::min(std::max(row, 0), height - 1);
                col = std::min(std::max(col, 0), width - 1);
                return gradient[row * width + col];
            };

            double degree = std::atan2(gradientY[i * width + j], gradientX[i * width + j]) * 180 / PI;
            int region = (int)(std::round((degree + 180) / 45)) % 8;

            int left = getGradientIndex(i + di[region], j + dj[region]);
            int right = getGradientIndex(i - di[region], j - dj[region]);

            float g = gradient[i * width + j];
            if (g > left && g > right)
                result[i * width + j] = g;
            else 
                result[i * width + j] = 0;
        }
    
    delete[] gradient;

    float maxValue = 0;
    for (int i = 0; i < height * width; i++)
        if (maxValue < result[i])
            maxValue = result[i];

    for (int i = 0; i < height * width; i++) 
        result[i] = result[i] / maxValue * 255;

    return result;
}

float* hysteresis(
    float* edge, 
    int height, int width, 
    int lowThreshold, int highThreshold
) {
    float* result = new float[height * width];
    for(int i = 0; i < height * width; i++) {
        if (edge[i] > highThreshold)
            result[i] = 2.0f;
        else if (edge[i] > lowThreshold)
            result[i] = 1.0f;
        else
            result[i] = 0.0f;
    }

    for(int i = 0; i < height * width; i++) {
        if (result[i] != 2.0f)
            continue;

        std::stack<int> stack;
        stack.push(i);

        while(!stack.empty()) {
            int index = stack.top();
            stack.pop();

            result[index] = 2.0f;

            int y = index / width;
            int x = index % width;

            for (int dy = -1; dy <= 1; dy++) 
                for (int dx = -1; dx <= 1; dx++) {
                    int ny = y + dy;
                    int nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && 
                        result[ny * width + nx] == 1.0f
                    )
                        stack.push(ny * width + nx);
                }
        }
    }

    for(int i = 0; i < height * width; i++)
        result[i] = result[i] == 2.0f ? 255 : 0;

    return result;
}

float* getCanny(
    uint8_t* src, int height, int width,
    int lowThreshold, int highThreshold
) {
    float* greyScale = getGreyScale(src, height, width);
    float* blurred = gaussianFilter(greyScale, height, width, 5, 2);
    delete[] greyScale;

    float* gradientX = sobelFilterX(blurred, height, width);
    float* gradientY = sobelFilterY(blurred, height, width);
    delete[] blurred;

    float* thinned = edgeThinning(gradientX, gradientY, height, width);
    delete[] gradientX;
    delete[] gradientY;

    float* result = hysteresis(thinned, height, width, lowThreshold, highThreshold);
    delete[] thinned;

    return result;
}