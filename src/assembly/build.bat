emcc transform.cpp ^
    -o build/transform.js ^
    -s EXPORT_ES6=1 ^
    -s NO_FILESYSTEM=1 ^
    -s DEMANGLE_SUPPORT=0 ^
    -s ASSERTIONS=0 ^
    -s NO_EXIT_RUNTIME=1 ^
    -s ALLOW_MEMORY_GROWTH=1 ^
    -s SINGLE_FILE=1 ^
    -O3 -msimd128 ^
    -s DISABLE_EXCEPTION_CATCHING=1 ^
    -s EXPORTED_FUNCTIONS="[\"_malloc\", \"_free\", \"_pixelateImageData\"]" ^
    -s EXPORTED_RUNTIME_METHODS="[\"cwrap\", \"ccall\"]"


