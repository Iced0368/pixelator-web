#pragma once
#include <iostream>
#include <cmath>
#include <initializer_list>

namespace Vector {
    template<typename T, int N>
    class vec {
    public:
        T value[N];
        vec() {
            for (int i = 0; i < N; ++i)
                value[i] = T();
        }

        vec(const T(&arr)[N]) {
            for (int i = 0; i < N; ++i)
                value[i] = arr[i];
        }

        vec(std::initializer_list<T> list) {
            int i = 0;
            for (const auto& elem : list) {
                value[i++] = elem;
            }
        }

        virtual T& operator[](std::size_t index) { return value[index]; }
        virtual const T& operator[](std::size_t index) const { return value[index]; }

        virtual vec<T, N> operator+(const vec<T, N>& other) const {
            vec<T, N> result;
            for (int i = 0; i < N; ++i)
                result[i] = this->value[i] + other.value[i];
            return result;
        }

        virtual vec<T, N> operator-(const vec<T, N>& other) const {
            vec<T, N> result;
            for (int i = 0; i < N; ++i)
                result[i] = this->value[i] - other.value[i];
            return result;
        }

        float norm() const {
            float sum = 0;
            for (int i = 0; i < N; ++i)
                sum += value[i] * value[i];
            return std::sqrt(sum);
        }

        static float distance(const vec<T, N>& a, const vec<T, N>& b) {
            return (a - b).norm();
        }

        void print() const {
            std::cout << "(";
            for (int i = 0; i < N; ++i) {
                std::cout << value[i];
                if (i < N - 1) std::cout << ", ";
            }
            std::cout << ")" << std::endl;
        }
    };
}