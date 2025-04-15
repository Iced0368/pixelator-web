#include <cmath>
#include <cstdint>
#include <algorithm>

// sRGB to XYZ conversion matrix
constexpr float SRGB_TO_XYZ[3][3] = {
    {0.4124564f, 0.3575761f, 0.1804375f},
    {0.2126729f, 0.7151522f, 0.0721750f},
    {0.0193339f, 0.1191920f, 0.9503041f}
};

// XYZ to sRGB conversion matrix
constexpr float XYZ_TO_SRGB[3][3] = {
    { 3.2404542f, -1.5371385f, -0.4985314f},
    {-0.9692660f,  1.8760108f,  0.0415560f},
    { 0.0556434f, -0.2040259f,  1.0572252f}
};

constexpr float Xn = 0.95047f; // Reference white D65
constexpr float Yn = 1.00000f;
constexpr float Zn = 1.08883f;

float f(float t) {
    return (t > 0.008856f) ? std::cbrt(t) : (7.787f * t + 16.0f / 116.0f);
}

float f_inv(float t) {
    return (t > 0.206893f) ? (t * t * t) : ((t - 16.0f / 116.0f) / 7.787f);
}

void rgba_to_lab(const uint8_t* rgba_data, float* lab_data, int pixel_count) {
    for (int i = 0; i < pixel_count; ++i) {
        float r = rgba_data[i * 4 + 0] / 255.0f;
        float g = rgba_data[i * 4 + 1] / 255.0f;
        float b = rgba_data[i * 4 + 2] / 255.0f;
        
        // sRGB to Linear RGB
        r = (r <= 0.04045f) ? (r / 12.92f) : std::pow((r + 0.055f) / 1.055f, 2.4f);
        g = (g <= 0.04045f) ? (g / 12.92f) : std::pow((g + 0.055f) / 1.055f, 2.4f);
        b = (b <= 0.04045f) ? (b / 12.92f) : std::pow((b + 0.055f) / 1.055f, 2.4f);
        
        // RGB to XYZ
        float X = SRGB_TO_XYZ[0][0] * r + SRGB_TO_XYZ[0][1] * g + SRGB_TO_XYZ[0][2] * b;
        float Y = SRGB_TO_XYZ[1][0] * r + SRGB_TO_XYZ[1][1] * g + SRGB_TO_XYZ[1][2] * b;
        float Z = SRGB_TO_XYZ[2][0] * r + SRGB_TO_XYZ[2][1] * g + SRGB_TO_XYZ[2][2] * b;
        
        // Normalize by D65 reference white
        X /= Xn;
        Y /= Yn;
        Z /= Zn;
        
        // XYZ to LAB
        float fx = f(X);
        float fy = f(Y);
        float fz = f(Z);
        
        lab_data[i * 3 + 0] = 116.0f * fy - 16.0f; // L
        lab_data[i * 3 + 1] = 500.0f * (fx - fy);  // a
        lab_data[i * 3 + 2] = 200.0f * (fy - fz);  // b
    }
}

void lab_to_rgba(const float* lab_data, uint8_t* rgba_data, int pixel_count) {
    for (int i = 0; i < pixel_count; ++i) {
        float L = lab_data[i * 3 + 0];
        float a = lab_data[i * 3 + 1];
        float b_star = lab_data[i * 3 + 2];
        
        // LAB to XYZ
        float fy = (L + 16.0f) / 116.0f;
        float fx = a / 500.0f + fy;
        float fz = fy - b_star / 200.0f;
        
        float X = Xn * f_inv(fx);
        float Y = Yn * f_inv(fy);
        float Z = Zn * f_inv(fz);
        
        // XYZ to Linear RGB
        float r = XYZ_TO_SRGB[0][0] * X + XYZ_TO_SRGB[0][1] * Y + XYZ_TO_SRGB[0][2] * Z;
        float g = XYZ_TO_SRGB[1][0] * X + XYZ_TO_SRGB[1][1] * Y + XYZ_TO_SRGB[1][2] * Z;
        float b = XYZ_TO_SRGB[2][0] * X + XYZ_TO_SRGB[2][1] * Y + XYZ_TO_SRGB[2][2] * Z;
        
        // Linear RGB to sRGB
        r = (r <= 0.0031308f) ? (12.92f * r) : (1.055f * std::pow(r, 1.0f / 2.4f) - 0.055f);
        g = (g <= 0.0031308f) ? (12.92f * g) : (1.055f * std::pow(g, 1.0f / 2.4f) - 0.055f);
        b = (b <= 0.0031308f) ? (12.92f * b) : (1.055f * std::pow(b, 1.0f / 2.4f) - 0.055f);
        
        // Clamp and convert to 8-bit
        rgba_data[i * 4 + 0] = static_cast<uint8_t>(std::round(std::max(0.0f, std::min(1.0f, r)) * 255.0f));
        rgba_data[i * 4 + 1] = static_cast<uint8_t>(std::round(std::max(0.0f, std::min(1.0f, g)) * 255.0f));
        rgba_data[i * 4 + 2] = static_cast<uint8_t>(std::round(std::max(0.0f, std::min(1.0f, b)) * 255.0f));
        rgba_data[i * 4 + 3] = 255; // Alpha channel remains unchanged
    }
}