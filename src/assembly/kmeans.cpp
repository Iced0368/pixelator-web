#pragma once
#include <algorithm>
#include "vector_base.cpp"

template<typename V, typename T, int N>
V& getClosest(
    V& target, 
    V* vectors, int length
) {
    float minDist = V::distance(vectors[0], target);
    int index = 0;

    for (int i = 1; i < length; i++) {
        float dist = V::distance(vectors[i], target);
        if (dist < minDist) {
            minDist = dist;
            index = i;
        }
    }
    return vectors[index];
}

template<typename V, typename T, int N>
V& getMedian(V* vectors, int length) {
    V median;
    for (int dim = 0; dim < N; dim++) {
        T* dimensionValues = new T[length];

        for (int i = 0; i < length; i++)
            dimensionValues[i] = vectors[i][dim];

        std::sort(dimensionValues, dimensionValues + length);
        median[dim] = dimensionValues[length / 2];

        delete[] dimensionValues;
    }
    return getClosest<V, T, N>(median, vectors, length);
}
