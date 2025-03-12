#include <stdint.h>
#include <algorithm>

#define CHANNELS 4
#define VALID_CHANNELS 3

uint8_t findOtsuThreshold(uint8_t** data, int size, int dim) {
    int histogram[UINT8_MAX] = {0};

    for (int i = 0; i < size; i++) {
        histogram[data[i][dim]]++;
    }
    
    int total = size;
    float sum = 0, sumB = 0;
    int nB = 0, nF = 0;
    float maxVar = 0;
    uint8_t threshold = 0;

    int minDiff = size;
    
    for (int i = 0; i < UINT8_MAX; i++) 
        sum += i * histogram[i];

    for (int i = 0; i < UINT8_MAX; i++) {
        nB += histogram[i];
        if (nB == 0) continue;
        nF = total - nB;
        if (nF == 0) break;
        
        sumB += i * histogram[i];
        float mB = sumB / nB;
        float mF = (sum - sumB) / nF;
        float wB = (float)nB / size;
        float wF = (float)nF / size;

        float varBetween = wB * wF * (mB - mF) * (mB - mF);
        
        if (varBetween > maxVar) {
            maxVar = varBetween;
            threshold = i;
        }
    }

    return threshold;
}

void buildKDTree(uint8_t* src, uint8_t** srcAddr, int size, int* labels, uint8_t* rep, int depth, int* partition_index) {
    if (size == 0) return;
    if (depth == 0) {
        uint8_t* channel = new uint8_t[size];
        for(int i = 0; i < VALID_CHANNELS; i++) {  
            for (int j = 0; j < size; j++)
                channel[j] = src[srcAddr[j] - src + i];

            std::sort(channel, channel + size);
            rep[VALID_CHANNELS * (*partition_index) + i] = channel[size / 2];
            
            //rep[VALID_CHANNELS * (*partition_index) + i] = src[srcAddr[size / 2] - src + i];
        }
        delete[] channel;

        for(int i = 0; i < size; i++)
            labels[(srcAddr[i] - src) / CHANNELS] = *partition_index;

        (*partition_index)++;
        return;
    }
    
    int dim = depth % VALID_CHANNELS;
    uint8_t threshold = findOtsuThreshold(srcAddr, size, dim);

    int leftSize = 0, rightSize = 0;
    for (int i = 0; i < size; i++) {
        if (srcAddr[i][dim] <= threshold) leftSize++;
        else rightSize++;
    }
    
    uint8_t** leftDataPtr = new uint8_t*[leftSize];
    uint8_t** rightDataPtr = new uint8_t*[rightSize];
    
    int li = 0, ri = 0;
    for (int i = 0; i < size; i++) {
        if (srcAddr[i][dim] <= threshold)
            leftDataPtr[li++] = srcAddr[i];
        else
            rightDataPtr[ri++] = srcAddr[i];
    }

    buildKDTree(src, leftDataPtr, leftSize, labels, rep, depth - 1, partition_index);
    delete[] leftDataPtr;
    buildKDTree(src, rightDataPtr, rightSize, labels, rep, depth - 1, partition_index);
    delete[] rightDataPtr;
}

int KDlabel(uint8_t* src, int size, int depth, int*& labels, uint8_t*& rep) {
    uint8_t** srcAddr = new uint8_t*[size];
    for(int i = 0; i < size; i++)
        srcAddr[i] = src + CHANNELS * i;
    
    int index = 0;
    buildKDTree(src, srcAddr, size, labels, rep, depth, &index);
    
    delete[] srcAddr;
    return index;
}