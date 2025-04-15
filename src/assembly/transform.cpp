#include <emscripten.h>
#include <stdint.h>
#include <string.h>
#include <algorithm>
#include <iostream>
#include <limits>
#include <stdlib.h>
#include <unordered_map>

#include "kdlabel.cpp"
#include "color_transform.cpp"

template <typename T, typename U>
float euclidean_distance(T* a, U* b) {
    float d[3]; 
    d[0] = (float)a[0] - b[0];
    d[1] = (float)a[1] - b[1];
    d[2] = (float)a[2] - b[2];

    return std::sqrt(d[0]*d[0] +  d[1]*d[1] + d[2]*d[2]);
}

template <typename T, typename U>
float xy_distance(T x1, T y1, U x2, U y2) {
    int d[2]; 
    d[0] = (float)x1 - x2;
    d[1] = (float)y1 - y2;

    return std::max(std::abs(d[0]), std::abs(d[1]));
    //return std::sqrt(d[0]*d[0] +  d[1]*d[1]);
}

template <typename T, typename U>
int find_closest(T* target, U* palette, int palette_size, int palette_stride=3) {
    float min_dist = std::numeric_limits<float>::max();
    int res = 0;

    for (int i = 0; i < palette_size; i++) {
        float dist = euclidean_distance(target, &palette[palette_stride*i]);
        if (min_dist > dist) {
            min_dist = dist;
            res = i;
        }
    }
    return res;
}

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void convertGrayToRGBA(uint8_t* src, uint8_t* dst, int length) {
        for (int i = 0; i < length; i++) {
            dst[4 * i] = src[i];
            dst[4 * i + 1] = src[i];
            dst[4 * i + 2] = src[i];
            dst[4 * i + 3] = 255;
        }
    }

    EMSCRIPTEN_KEEPALIVE
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
                for (int channel = 0; channel < 4; channel++) {
                    int ci = 0;
                    for (int cy = cy_start; cy < cy_end; cy++)
                        for (int cx = cx_start; cx < cx_end; cx++)
                            channel_value[ci++] = src[4 * (cy * width + cx) + channel];

                    std::nth_element(channel_value, channel_value + cell_size / 2, channel_value + cell_size);
                    dst[4*idx + channel] = channel_value[cell_size / 2];
                }
                delete[] channel_value;
            }
    }

    EMSCRIPTEN_KEEPALIVE
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

                int ci = 0;
                int edge_cnt = 0;
                for (int cy = cy_start; cy < cy_end; cy++)
                    for (int cx = cx_start; cx < cx_end; cx++) {
                        int s_idx = cy * width + cx;

                        if (edge[s_idx]) 
                            edge_cnt++;
                        ci++;
                    }

                edgeness[idx] = 255 * edge_cnt / cell_size;

                float t = std::powf((float)edgeness[idx] / 255, 100.f / sensitivity - 1);

                dst[4*idx]     = (uint8_t)((1.f - t)*img[4*idx]);
                dst[4*idx + 1] = (uint8_t)((1.f - t)*img[4*idx + 1]);
                dst[4*idx + 2] = (uint8_t)((1.f - t)*img[4*idx + 2]);
            }
    }

    void kdMeansQuantizationPaletteIn(
        uint8_t* src, uint8_t* dst, 
        int height, int width, 
        uint8_t* palette, int palette_size
    ) {
        const int size = height * width;


        float* centroids = new float[3 * palette_size];
        int _palette_size = 0;
        for(int i = 0; i < palette_size; i++) {
            if (palette[4*i + 3]) {
                centroids[3*i] = palette[4*_palette_size];
                centroids[3*i + 1] = palette[4*_palette_size + 1];
                centroids[3*i + 2] = palette[4*_palette_size + 2];
                _palette_size++;
            }
        }
        palette_size = _palette_size;

        printf("palette size= %d\n", palette_size);

        for (int i = 0; i < size; i++) {
            int closest_cluster = find_closest(&src[4*i], centroids, palette_size);

            dst[4*i] = palette[4*closest_cluster];
            dst[4*i + 1] = palette[4*closest_cluster + 1];
            dst[4*i + 2] = palette[4*closest_cluster + 2];
            dst[4*i + 3] = src[4*i + 3];
        }
    }

    void kdMeansQuantizationPaletteOut(
        uint8_t* src, uint8_t* dst, 
        int height, int width, 
        uint8_t* palette, int palette_size
    ) {
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
                int closest_cluster = find_closest(&quantized[3*i], centroids, palette_size);

                clusters[closest_cluster][cluster_length[closest_cluster]++] = i;
                cluster_size[closest_cluster] += hist[i];
            }

            uint8_t* channel_value = new uint8_t[palette_size];
            for (int c_idx = 0; c_idx < palette_size; c_idx++) {
                float new_centroid[3];
                for (int channel = 0; channel < 3; channel++) {
                    float value = 0;
                    for (int i = 0; i < cluster_length[c_idx]; i++)
                        value += (float)hist[clusters[c_idx][i]] * quantized[3 * clusters[c_idx][i] + channel] / cluster_size[c_idx];

                    new_centroid[channel] = value;
                }
                float dist = euclidean_distance(&centroids[3 * c_idx], new_centroid);

                centroids[3 * c_idx] = new_centroid[0];
                centroids[3 * c_idx + 1] = new_centroid[1];
                centroids[3 * c_idx + 2] = new_centroid[2];

                if (dist >= 1) {
                    updated = true;
                }
            }
            delete[] channel_value;
        }

        printf("k-means iteration= %d\n", cnt);

        for (int i = 0; i < size; i++) {
            int closest_index = find_closest(&src[4*i], centroids, palette_size);

            dst[4 * i]     = centroids[3 * closest_index];
            dst[4 * i + 1] = centroids[3 * closest_index + 1];
            dst[4 * i + 2] = centroids[3 * closest_index + 2];
            dst[4 * i + 3] = src[4 * i + 3];

        }

        if (palette != nullptr) {
            for (int i = 0; i < palette_size; i++) {
                palette[4 * i] = centroids[3 * i];
                palette[4 * i + 1] = centroids[3 * i + 1];
                palette[4 * i + 2] = centroids[3 * i + 2];
                palette[4 * i + 3] = 255;
            }
            std::sort((uint32_t*)palette, (uint32_t*)palette + palette_size);
        }

        delete[] labels;
        delete[] quantized;
        delete[] centroids;

        delete[] cluster_length;
        delete[] cluster_size;
        for(int i = 0; i < palette_size; i++)
            delete[] clusters[i];
        delete[] clusters;
    }

    EMSCRIPTEN_KEEPALIVE
    void kdMeansQuantization(
        uint8_t* src, uint8_t* dst, 
        int height, int width, 
        uint8_t* palette, int palette_size,
        int mode
    ) {
        if (mode == 0) {
            kdMeansQuantizationPaletteIn(src, dst, height, width, palette, palette_size);
        }
        else if (mode == 1){
            kdMeansQuantizationPaletteOut(src, dst, height, width, palette, palette_size);
        }
    };

    EMSCRIPTEN_KEEPALIVE
    void dithering(
        uint8_t* src, uint8_t* dst,
        int height, int width,
        uint8_t* palette, int palette_size
    ) {
        int size = height * width;
        int* img = new int[4 * size];
        for (int i = 0; i < 4 * size; i++)
            img[i] = src[i];

        printf("%d\n", palette_size);

        int dy[] = {0, 1, 1, 1};
        int dx[] = {1, -1, 0, 1};
        int weight[] = {7, 3, 5, 1};
        int weight_sum = 16;

        for(int y = 0; y < height; y++)
            for(int x = 0; x < width; x++) {
                int index = y * width + x;

                int* old_pixel = &img[4*index];
                int ci = find_closest(old_pixel, palette, palette_size, 4);
                uint8_t* new_pixel = &palette[4 * ci];

                int quant_error[3] = {
                    src[4*index + 0] - new_pixel[0],
                    src[4*index + 1] - new_pixel[1],
                    src[4*index + 2] - new_pixel[2],
                };

                dst[4*index] =  new_pixel[0];
                dst[4*index + 1] = new_pixel[1];
                dst[4*index + 2] = new_pixel[2];
                dst[4*index + 3] = src[4*index + 3];

                for (int i = 0; i < 4; i++) {
                    int ny = y + dy[i];
                    int nx = x + dx[i];
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width)
                        continue;

                    int nindex = ny * width + nx;

                    img[4*nindex] += weight[i]*quant_error[0] / weight_sum;
                    img[4*nindex + 1] += weight[i]*quant_error[1] / weight_sum;
                    img[4*nindex + 2] += weight[i]*quant_error[2] / weight_sum;
                }
            }
    }

    EMSCRIPTEN_KEEPALIVE
    void removeBorder(
        uint8_t* src, uint8_t* dst,
        int height, int width
    ) {
        int stride = std::ceil(std::sqrt(height * width) / 256);

        for(int y = 0; y < height; y++)
            for(int x = 0; x < width; x++) {
                int cy_start = std::max(0, y - stride);
                int cy_end = std::min(height, y + stride);
                int cx_start = std::max(0, x - stride);
                int cx_end = std::min(width, x + stride);

                int cell_height = cy_end - cy_start;
                int cell_width  = cx_end - cx_start;
                int cell_size = cell_height * cell_width;
                int idx = y * width + x;

                uint8_t* channel_value = new uint8_t[cell_size];
                for (int channel = 0; channel < 4; channel++) {
                    int ci = 0;
                    for (int cy = cy_start; cy < cy_end; cy++)
                        for (int cx = cx_start; cx < cx_end; cx++)
                            channel_value[ci++] = src[4 * (cy * width + cx) + channel];

                    std::nth_element(channel_value, channel_value + cell_size / 2, channel_value + cell_size);
                    dst[4*idx + channel] = channel_value[cell_size / 2];
                }
                delete[] channel_value;
            }
    }

    EMSCRIPTEN_KEEPALIVE
    void superPixel(
        uint8_t* src, uint8_t* dst,
        int height, int width,
        int new_height, int new_width
    ) {
        int N = new_height * new_width;
        int M = height * width;

        float m = 45;
        float dp_weight = m * std::sqrt((float)N / M);

        float* lab_data = new float[3 * M];
        rgba_to_lab(src, lab_data, M);

        int* labels = new int[M];
        float* centroids = new float[5 * N];
        int* cluster_size = new int[N];

        for(int y = 0; y < new_height; y++)
            for(int x = 0; x < new_width; x++) {
                int idx = y * new_width + x;
                int cy = (y + 0.5f) * height / new_height;
                int cx = (x + 0.5f) * width / new_width;

                int cidx = cy * width + cx;

                centroids[5*idx] = lab_data[3*cidx];
                centroids[5*idx + 1] = lab_data[3*cidx + 1];
                centroids[5*idx + 2] = lab_data[3*cidx + 2];
                centroids[5*idx + 3] = cx;
                centroids[5*idx + 4] = cy;
            }

        int cnt = 0;
        int updated = M;
        while (updated > (M + 999) / 1000 && cnt++ < 30) {
            printf("%d / %d\n", updated, M);
            updated = 0;
            memset(cluster_size, 0, sizeof(int) * N);

            for(int cy = 0; cy < height; cy++)
                for(int cx = 0; cx < width; cx++) {
                    int idx = cy * width + cx;
                    int y = cy * new_height / height;
                    int x = cx * new_width / width;

                    int closest_cluster = 0;
                    float min_dist = std::numeric_limits<float>::max();
                    for (int dx = -1; dx <= 1; dx++)
                        for (int dy = -1; dy <= 1; dy++) {
                            int ny = y + dy;
                            int nx = x + dx;

                            if (ny < 0 || ny >= new_height || nx < 0 || nx >= new_width)
                                continue;

                            int c_idx = ny * new_width + nx;
                            
                            float dc = euclidean_distance(&centroids[5*c_idx], &lab_data[3*idx]);
                            float dp = xy_distance(centroids[5*c_idx + 3], centroids[5*c_idx + 4], cx, cy);
                            
                            float dist = dc + dp_weight * dp;

                            if (min_dist > dist) {
                                min_dist = dist;
                                closest_cluster = c_idx;
                            }
                        }

                    if (labels[idx] != closest_cluster)
                        updated++;
                    labels[idx] = closest_cluster;
                    cluster_size[closest_cluster]++;
                }

            for (int i = 0; i < N; i++) {
                if (cluster_size[i] > 0) {
                    centroids[5*i] = 0;
                    centroids[5*i + 1] = 0;
                    centroids[5*i + 2] = 0;
                    centroids[5*i + 3] = 0;
                    centroids[5*i + 4] = 0;
                }
            }

            for (int i = 0; i < M; i++) {
                int c_idx = labels[i];
                centroids[5*c_idx] += lab_data[3*i];
                centroids[5*c_idx + 1] += lab_data[3*i + 1];
                centroids[5*c_idx + 2] += lab_data[3*i + 2];
                centroids[5*c_idx + 3] += i % width;
                centroids[5*c_idx + 4] += i / width;
            }

            int disabled_cnt = 0;

            for (int i = 0; i < N; i++) {
                if (cluster_size[i] > 0) {
                    centroids[5*i] /= cluster_size[i];
                    centroids[5*i + 1] /= cluster_size[i];
                    centroids[5*i + 2] /= cluster_size[i];
                    centroids[5*i + 3] /= cluster_size[i];
                    centroids[5*i + 4] /= cluster_size[i];
                }
            }
        }
        printf("superpixel clustering iteration= %d\n", cnt);

        for(int y = 0; y < new_height; y++)
            for(int x = 0; x < new_width; x++) {
                int idx = y * new_width + x;
                int cy = (y + 0.5f) * height / new_height;
                int cx = (x + 0.5f) * width / new_width;

                int cidx = cy * width + cx;

                lab_to_rgba(&centroids[5*idx], &dst[4*idx], 1);
                dst[4*idx + 3] = src[4*cidx + 3];
            }

        delete[] lab_data;
    }

    EMSCRIPTEN_KEEPALIVE
    void __superPixel(
        uint8_t* src, uint8_t* dst,
        int height, int width,
        int new_height, int new_width
    ) {
        int N = new_height * new_width;
        int M = height * width;

        float m = 10;
        float DP_WEIGHT = m * std::sqrt((float)N / M);
        float dp_weight = 0;

        int palette_size = 4;
        int k = 1;

        int* labels = new int[M];
        float* centroids = new float[5 * N];
        int* cluster_size = new int[N];

        centroids[0] = 0; centroids[1] = 0; centroids[2] = 0;

        while (k <= palette_size) {
            int cnt = 0;
            int updated = M;
            dp_weight = 0;
            while (updated > (M + 999) / 1000 && cnt++ < 30) {
                printf("%d / %d\n", updated, M);
                updated = 0;
                memset(cluster_size, 0, sizeof(int) * k);

                for(int cy = 0; cy < height; cy++)
                    for(int cx = 0; cx < width; cx++) {
                        int idx = cy * width + cx;
                        int y = cy * new_height / height;
                        int x = cx * new_width / width;

                        int closest_cluster = 0;
                        float min_dist = std::numeric_limits<float>::max();
                        for (int c_idx = 0; c_idx < N; c_idx++) {
                            float dc = euclidean_distance(&centroids[5*c_idx], &src[4*idx]);
                            float dp = xy_distance(centroids[5*c_idx + 3], centroids[5*c_idx + 4], cx, cy);
                            
                            float dist = dc + dp_weight * dp;

                            if (min_dist > dist) {
                                min_dist = dist;
                                closest_cluster = c_idx;
                            }
                        }

                        if (labels[idx] != closest_cluster)
                            updated++;
                        labels[idx] = closest_cluster;
                        cluster_size[closest_cluster]++;
                    }

                for (int i = 0; i < N; i++) {
                    if (cluster_size[i] > 0) {
                        centroids[5*i] = 0;
                        centroids[5*i + 1] = 0;
                        centroids[5*i + 2] = 0;
                        centroids[5*i + 3] = 0;
                        centroids[5*i + 4] = 0;
                    }
                }

                for (int i = 0; i < M; i++) {
                    int c_idx = labels[i];
                    centroids[5*c_idx] += src[4*i];
                    centroids[5*c_idx + 1] += src[4*i + 1];
                    centroids[5*c_idx + 2] += src[4*i + 2];
                    centroids[5*c_idx + 3] += i % width;
                    centroids[5*c_idx + 4] += i / width;
                }

                for (int i = 0; i < N; i++) {
                    if (cluster_size[i] > 0) {
                        centroids[5*i] /= cluster_size[i];
                        centroids[5*i + 1] /= cluster_size[i];
                        centroids[5*i + 2] /= cluster_size[i];
                        centroids[5*i + 3] /= cluster_size[i];
                        centroids[5*i + 4] /= cluster_size[i];
                    }
                }

                //dp_weight = DP_WEIGHT;
            }

            for(int i = 0; i < k; i++)
                printf("%f %f %f %f %f\n", 
                    centroids[5*i],
                    centroids[5*i + 1],
                    centroids[5*i + 2],
                    centroids[5*i + 3],
                    centroids[5*i + 4]
                );

            printf("superpixel clustering iteration= %d\n", cnt);

            centroids[5*k] = 255; centroids[5*k + 1] = 255; centroids[5*k + 2] = 255;
            k++;
        }
        
        for (int i = 0; i < M; i++) {
            int c_idx = labels[i];

            dst[4*i] = centroids[5*c_idx];
            dst[4*i + 1] = centroids[5*c_idx + 1];
            dst[4*i + 2] = centroids[5*c_idx + 2];
            dst[4*i + 3] = 255;
        }
        return;
        
        
        for(int y = 0; y < new_height; y++)
            for(int x = 0; x < new_width; x++) {
                int cy_start = y * height / new_height;
                int cx_start = x * width / new_width;
                int cy_end = (y + 1) * height / new_height;
                int cx_end = (x + 1) * width / new_width;

                int idx = y * new_width + x;

                std::unordered_map<int, int> freq_map;
                int max_label = 0, max_count = 0;

                for (int cy = cy_start; cy < cy_end; cy++) {
                    for (int cx = cx_start; cx < cx_end; cx++) {
                        int label = labels[cy * width + cx];  
                        freq_map[label]++;

                        if (freq_map[label] > max_count) { 
                            max_count = freq_map[label];
                            max_label = label;
                        }
                    }
                }

                dst[4*idx] = centroids[5*max_label];
                dst[4*idx + 1] = centroids[5*max_label + 1];
                dst[4*idx + 2] = centroids[5*max_label + 2];
                dst[4*idx + 3] = 255;
            }
        
    }
}