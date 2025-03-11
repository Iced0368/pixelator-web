#include <stdint.h>
#include <emscripten.h>
#include <algorithm>
#include <iostream>

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

                uint8_t* rs = new uint8_t[cell_size];
                uint8_t* gs = new uint8_t[cell_size];
                uint8_t* bs = new uint8_t[cell_size];
                uint8_t* as = new uint8_t[cell_size];

                int ci = 0;
                for (int cy = cy_start; cy < cy_end; cy++)
                    for (int cx = cx_start; cx < cx_end; cx++) {
                        int src_idx = 4 * (cy * width + cx);

                        rs[ci] = src[src_idx];
                        gs[ci] = src[src_idx + 1];
                        bs[ci] = src[src_idx + 2];
                        as[ci] = src[src_idx + 3];
                        ci++;
                    }
                
                std::sort(rs, rs + cell_size);
                std::sort(gs, gs + cell_size);
                std::sort(bs, bs + cell_size);
                std::sort(as, as + cell_size);

                dst[4*idx] =     rs[cell_size / 2];
                dst[4*idx + 1] = gs[cell_size / 2];
                dst[4*idx + 2] = bs[cell_size / 2];
                dst[4*idx + 3] = as[cell_size / 2];

                delete[] rs; delete[] gs; delete[] bs; delete[] as;
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

                int edge_cnt = 0;
                for (int cy = cy_start; cy < cy_end; cy++)
                    for (int cx = cx_start; cx < cx_end; cx++)
                        if (edge[cy * width + cx]) 
                            edge_cnt++;

                edgeness[idx] = 255 * edge_cnt / cell_size;

                if (!edge_cnt)
                    continue;

                uint8_t* rs = new uint8_t[cell_size];
                uint8_t* gs = new uint8_t[cell_size];
                uint8_t* bs = new uint8_t[cell_size];
                
                uint8_t* rs_e = new uint8_t[edge_cnt];
                uint8_t* gs_e = new uint8_t[edge_cnt];
                uint8_t* bs_e = new uint8_t[edge_cnt];
                
                int ci = 0;
                int ei = 0;
                for (int cy = cy_start; cy < cy_end; cy++)
                    for (int cx = cx_start; cx < cx_end; cx++) {
                        int src_idx = 4 * (cy * width + cx);

                        rs[ci] = src[src_idx];
                        gs[ci] = src[src_idx + 1];
                        bs[ci] = src[src_idx + 2];
                        ci++;

                        if (edge[cy * width + cx]) {
                            rs_e[ei] = 255 - src[src_idx];
                            gs_e[ei] = 255 - src[src_idx + 1];
                            bs_e[ei] = 255 - src[src_idx + 2];
                            ei++;
                        }
                    }

                std::sort(rs_e, rs_e + cell_size);
                std::sort(gs_e, gs_e + cell_size);
                std::sort(bs_e, bs_e + cell_size);

                float t = std::powf((float)edge_cnt / cell_size, 100.f / sensitivity - 1);

                uint8_t edge_r = (1.f - t)*img[4*idx]     + t*rs_e[edge_cnt / 2];
                uint8_t edge_g = (1.f - t)*img[4*idx + 1] + t*gs_e[edge_cnt / 2];
                uint8_t edge_b = (1.f - t)*img[4*idx + 2] + t*bs_e[edge_cnt / 2];

                int min_dist = 9999;
                for (int i = 0; i < ci; i++) {
                    int dist = std::abs((int)rs[i] - edge_r) + std::abs((int)gs[i] - edge_g) + std::abs((int)bs[i] - edge_b);
                    if (dist < min_dist) {
                        min_dist = dist;
                        dst[4*idx]     = rs[i];
                        dst[4*idx + 1] = gs[i];
                        dst[4*idx + 2] = bs[i];
                    }
                }
            }
    }
}