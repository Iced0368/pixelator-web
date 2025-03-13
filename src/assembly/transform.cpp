#include <stdint.h>
#include <string.h>
#include <algorithm>
#include <iostream>

#include "kdlabel.cpp"

extern "C" {
    void convertGrayToRGBA(uint8_t* src, uint8_t* dst, int length) {
        for (int i = 0; i < length; i++) {
            dst[4 * i] = src[i];
            dst[4 * i + 1] = src[i];
            dst[4 * i + 2] = src[i];
            dst[4 * i + 3] = 255;
        }
    }

    void medianResize(
        uint8_t* src, uint8_t* dst,
        int height, int width,
        int new_height, int new_width
    ) {
        for(int y = 0; y < new_height; y++)
            for(int x = 0; x < new_width; x++) {
                int cy_start = y * height / new_height;
                int cx_start = x * width / new_width;
                int cy_end = (y + 1) * height / new_height;
                int cx_end = (x + 1) * width / new_width;

                int cell_height = cy_end - cy_start;
                int cell_width  = cx_end - cx_start;
                int cell_size = cell_height * cell_width;
                int idx = y * new_width + x;

                uint8_t* channel_value = new uint8_t[cell_size];
                for (int channel = 0; channel < 3; channel++) {
                    int ci = 0;
                    for (int cy = cy_start; cy < cy_end; cy++)
                        for (int cx = cx_start; cx < cx_end; cx++)
                            channel_value[ci++] = src[4 * (cy * width + cx) + channel];

                    std::sort(channel_value, channel_value + cell_size);
                    dst[4*idx + channel] = channel_value[cell_size / 2];
                }
                dst[4*idx + 3] = src[4*idx + 3];
                delete[] channel_value;
            }
    }

    void emphasizeEdge(
        uint8_t* src, uint8_t* dst, uint8_t* img,
        uint8_t* edge, uint8_t* edgeness,
        int height, int width,
        int new_height, int new_width,
        int sensitivity
    ) {
        for(int y = 0; y < new_height; y++)
            for(int x = 0; x < new_width; x++) {
                int cy_start = y * height / new_height;
                int cx_start = x * width / new_width;
                int cy_end = (y + 1) * height / new_height;
                int cx_end = (x + 1) * width / new_width;

                int cell_height = cy_end - cy_start;
                int cell_width  = cx_end - cx_start;
                int cell_size = cell_height * cell_width;
                int idx = y * new_width + x;

                uint8_t* rs = new uint8_t[cell_size];
                uint8_t* gs = new uint8_t[cell_size];
                uint8_t* bs = new uint8_t[cell_size];

                int ci = 0;
                int edge_cnt = 0;
                for (int cy = cy_start; cy < cy_end; cy++)
                    for (int cx = cx_start; cx < cx_end; cx++) {
                        int s_idx = cy * width + cx;

                        if (edge[s_idx]) 
                            edge_cnt++;

                        rs[ci] = src[4*s_idx];
                        gs[ci] = src[4*s_idx + 1];
                        bs[ci] = src[4*s_idx + 2];
                        ci++;
                    }

                edgeness[idx] = 255 * edge_cnt / cell_size;

                float t = std::powf((float)edge_cnt / cell_size, 100.f / sensitivity - 1);

                uint8_t edge_r = (1.f - t)*img[4*idx];
                uint8_t edge_g = (1.f - t)*img[4*idx + 1];
                uint8_t edge_b = (1.f - t)*img[4*idx + 2];

                int min_dist = 256*3;
                for (int i = 0; i < ci; i++) {
                    int dist = std::abs((int)rs[i] - edge_r) + std::abs((int)gs[i] - edge_g) + std::abs((int)bs[i] - edge_b);
                    if (dist < min_dist) {
                        min_dist = dist;
                        dst[4*idx]     = rs[i];
                        dst[4*idx + 1] = gs[i];
                        dst[4*idx + 2] = bs[i];
                    }
                }

                delete[] rs; delete[] gs; delete[] bs;
            }
    }

    void kdMeansQuantization(uint8_t* src, uint8_t* dst, int height, int width, int palette_size) {
        const int KD_DEPTH = 12;
        const int size = height * width;

        int* labels = new int[size];
        uint8_t* quantized = new uint8_t[3 * (1 << KD_DEPTH)];

        int label_size = KDLabel(src, size, KD_DEPTH, labels, quantized);
        printf("label_size= %d\n", label_size);

        float* centroids = new float[3 * palette_size];
        int** clusters = new int*[palette_size];

        int* cluster_length = new int[palette_size];
        int* cluster_size = new int[palette_size];
        int* label_cluster = new int[label_size];

        for (int i = 0; i < palette_size; i++) {
            int index = i * label_size / palette_size;
            
            centroids[3 * i] = quantized[3 * index];
            centroids[3 * i + 1] = quantized[3 * index + 1];
            centroids[3 * i + 2] = quantized[3 * index + 2];

            clusters[i] = new int[label_size];
        }

        int* hist = new int[label_size]();
        for (int i = 0; i < size; i++)
            hist[labels[i]]++;

        int cnt = 0;
        bool updated = true;
        while (updated && cnt++ < 100) {
            updated = false;
            memset(cluster_size, 0, sizeof(int) * palette_size);
            memset(cluster_length, 0, sizeof(int) * palette_size);

            for (int i = 0; i < label_size; i++) {
                int closest_cluster = 0;
                float min_dist = 256 * 3;
                for (int c_idx = 0; c_idx < palette_size; c_idx++) {
                    float dist = std::abs(quantized[3 * i] - centroids[3 * c_idx])
                                + std::abs(quantized[3 * i + 1] - centroids[3 * c_idx + 1])
                                + std::abs(quantized[3 * i + 2] - centroids[3 * c_idx + 2]);
    
                    if (min_dist > dist) {
                        min_dist = dist;
                        closest_cluster = c_idx;
                    }
                }
                clusters[closest_cluster][cluster_length[closest_cluster]++] = i;
                cluster_size[closest_cluster] += hist[i];

                label_cluster[i] = closest_cluster;
            }

            uint8_t* channel_value = new uint8_t[palette_size];
            for (int c_idx = 0; c_idx < palette_size; c_idx++) {
                float dist = 0;
                for (int channel = 0; channel < 3; channel++) {
                    float value = 0;
                    for (int i = 0; i < cluster_length[c_idx]; i++)
                        value += (float)hist[clusters[c_idx][i]] * quantized[3 * clusters[c_idx][i] + channel] / cluster_size[c_idx];

                    float new_centroid_value = value;
                    dist += std::abs(centroids[3 * c_idx + channel] - new_centroid_value);

                    centroids[3 * c_idx + channel] = new_centroid_value;
                }

                if (dist >= 1) {
                    updated = true;
                }
            }
            delete[] channel_value;
        }

        printf("k-means iteration= %d\n", cnt);

        for (int i = 0; i < size; i++) {
            dst[4 * i]     = centroids[3 * label_cluster[labels[i]]];
            dst[4 * i + 1] = centroids[3 * label_cluster[labels[i]] + 1];
            dst[4 * i + 2] = centroids[3 * label_cluster[labels[i]] + 2];
            dst[4 * i + 3] = src[4 * i + 3];
        }

        delete[] labels;
        delete[] quantized;
        delete[] centroids;
    }
}