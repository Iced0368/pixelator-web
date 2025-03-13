#include <stdint.h>
#include <string.h>
#include <algorithm>

#define VALID_CHANNELS 3

uint8_t findOtsuThreshold(uint8_t** start, uint8_t** end, int channel) {
    int size = end - start;
    int hist[UINT8_MAX] = {0};
    
    for (uint8_t** p = start; p < end; p++)
        hist[(*p)[channel]]++;
    
    int total = size;
    float sum = 0, sumB = 0;
    int nB = 0, nF = 0;
    float maxVar = 0;
    uint8_t threshold = 0;

    int minDiff = size;
    
    for (int i = 0; i < UINT8_MAX; i++) 
        sum += i * hist[i];

    for (int i = 0; i < UINT8_MAX; i++) {
        nB += hist[i];
        if (nB == 0) continue;
        nF = total - nB;
        if (nF == 0) break;
        
        sumB += i * hist[i];
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

int KDSort(uint8_t* base, uint8_t** start, uint8_t** end, int depth, int* labels, uint8_t* rep, int label) {
    if (start == end) return label;
    if (depth == 0) {
        int size = end - start;

        for (uint8_t** p = start; p < end; p++)
            labels[(*p - base) / 4] = label;

        uint8_t* channel_value = new uint8_t[size];
        for (int channel = 0; channel < VALID_CHANNELS; channel++) {
            for (uint8_t** p = start; p < end; p++)
                channel_value[p - start] = (*p)[channel];  

            std::sort(channel_value, channel_value + size);
            rep[VALID_CHANNELS * label + channel] = channel_value[size / 2];
        }
        delete[] channel_value;

        return ++label;
    }

    int channel  = depth % VALID_CHANNELS;
    uint8_t threshold = findOtsuThreshold(start, end, channel);

    uint8_t** mid = (uint8_t**)std::partition((uint32_t**)start, (uint32_t**)end, [channel, threshold](const uint32_t* p) {
        return ((uint8_t*)p)[channel] <= threshold; 
    });

    label = KDSort(base, start, mid, depth-1, labels, rep, label);
    label = KDSort(base, mid, end, depth-1, labels, rep, label);

    return label;
}


int KDLabel(uint8_t* src, int size, int depth, int* labels, uint8_t* rep) {
    uint8_t** src_ptr = new uint8_t*[size];
    for (int i = 0; i < size; i++)
        src_ptr[i] = src + 4*i;

    int label_size = KDSort(src, src_ptr, src_ptr + size, depth, labels, rep, 0);
    return label_size;
}