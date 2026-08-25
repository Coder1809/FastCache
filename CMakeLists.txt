cmake_minimum_required(VERSION 3.16)
project(FastCache VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_compile_options(-Wall -Wextra -Wpedantic)

# Core library
add_library(fastcache_core STATIC src/CacheEngine.cpp)
target_include_directories(fastcache_core PUBLIC include)

# CLI executable
add_executable(fastcache src/main.cpp)
target_link_libraries(fastcache PRIVATE fastcache_core)

# Tests + benchmark
add_executable(fastcache_test tests/benchmark.cpp)
target_link_libraries(fastcache_test PRIVATE fastcache_core pthread)

enable_testing()
add_test(NAME FastCacheTests COMMAND fastcache_test)
