#include <stdint.h>
#include <stdexcept>
#include <emscripten.h>

#include "rgba.cpp"
#include "canny.cpp"
#include "kmeans.cpp"

RGBA& getDominantColor(
    RGBA* cell, int cellLength,
    RGBA* cellEdge, int cellEdgeLength,
    float closeness, float sensitivity
) {
    RGBA median = getMedian<RGBA, int, 4>(cell, cellLength);
    RGBA complimentary = RGBA(255, 255, 255, 0) - median;

    if (cellEdgeLength) {
        RGBA edgeColor = getClosest<RGBA, int, 4>(complimentary, cell, cellLength);

        float t = sensitivity == 0 ? 0 : std::pow(closeness, 100 / sensitivity - 1);
        RGBA target = RGBA(
            (1 - t)*median[0] + t*edgeColor[0],
            (1 - t)*median[1] + t*edgeColor[1],
            (1 - t)*median[2] + t*edgeColor[2],
            (1 - t)*median[3] + t*edgeColor[3]
        );
        return getClosest<RGBA, int, 4>(target, cell, cellLength);
    }
    else 
        return median;
}

extern "C" {
    void pixelateImageData(
        uint8_t* src, uint8_t* output, uint8_t* edge, uint8_t* edgeness,
        int height, int width, 
        int newHeight, int newWidth, 
        float threshold, float sensitivity
    ) {
        RGBA** cellColors = new RGBA*[newHeight * newWidth];
        RGBA** cellEdgeColors = new RGBA*[newHeight * newWidth];

        int* cellSize = new int[newHeight * newWidth];
        int* cellEdgeSize = new int[newHeight * newWidth];

        float* canny = getCanny(src, height, width, threshold * 127, threshold * 255);
        for (int i = 0; i < height * width; i++)
            edge[i] = (uint8_t)canny[i];

        for(int h = 0; h < newHeight; h++)
            for(int w = 0; w < newWidth; w++) {
                int i_start = h * height / newHeight;
                int i_end = (h + 1) * height / newHeight;
                int j_start = w * width / newWidth;
                int j_end = (w + 1) * width / newWidth;
                int cellHeight = i_end - i_start;
                int cellWidth = j_end - j_start;
                int cellIndex = h * newWidth + w;

                cellEdgeSize[cellIndex] = 0;

                cellColors[cellIndex] = new RGBA[cellHeight * cellWidth];
                cellEdgeColors[cellIndex] = new RGBA[cellHeight * cellWidth];
                cellSize[cellIndex] = cellHeight * cellWidth;

                int last = 0;
                for(int i = i_start; i < i_end; i++)
                    for(int j = j_start; j < j_end; j++) {
                        int index = 4*(i * width + j);

                        RGBA rgba = RGBA(src[index], src[index + 1], src[index + 2], src[index + 3]);
                        cellColors[cellIndex][last++] = rgba;

                        if (canny[i * width + j] > 0) {
                            cellEdgeColors[cellIndex][cellEdgeSize[cellIndex]++] = rgba;
                        }
                    }   
                edgeness[cellIndex] = 255 * cellEdgeSize[cellIndex] / (cellHeight * cellWidth);
            }

        int maxVal = 1;
        for (int i = 0; i < newHeight * newWidth; i++)
            if (maxVal < edgeness[i])
                maxVal = edgeness[i];

        for (int i = 0; i < newHeight * newWidth; i++)
            edgeness[i] = 255 * edgeness[i] / maxVal;

        for(int h = 0; h < newHeight; h++)
            for(int w = 0; w < newWidth; w++) {
                int cellIndex = h * newWidth + w;

                RGBA median = getDominantColor(
                    cellColors[cellIndex], cellSize[cellIndex],
                    cellEdgeColors[cellIndex], cellEdgeSize[cellIndex],
                    (float)edgeness[cellIndex] / 255, sensitivity
                );

                int index = 4 * (h * newWidth + w);
                output[index] = median[0];
                output[index + 1] = median[1];
                output[index + 2] = median[2];
                output[index + 3] = median[3];
            }

        delete[] canny;

        for(int i = 0; i < newHeight * newWidth; i++)
            delete[] cellColors[i];
        delete[] cellColors;
    }
}