#pragma once
#include "vector_base.cpp"

class RGBA : public Vector::vec<int, 4> {
public:
    RGBA() : Vector::vec<int, 4>() {};
    RGBA(int r, int g, int b, int a) : Vector::vec<int, 4>({r, g, b, a}) {};
    RGBA(Vector::vec<int, 4> vec) : Vector::vec<int, 4>(vec.value) {};
    
    float norm() const { 
        return (float)(
            0.3*std::abs(value[0]) 
            + 0.59*std::abs(value[1]) 
            + 0.11*std::abs(value[2])
        ) * value[3] / 255; 
    }
    
    static float distance(const RGBA& v1, const RGBA& v2) {
        auto diff = v1 - v2;
        return std::abs(diff[0]) + std::abs(diff[1]) + std::abs(diff[2]) + std::abs(diff[3]);
    }
};