#include "CacheEngine.hpp"

#include <chrono>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using namespace fastcache;

static int passed = 0;
static int failed = 0;

#define CHECK(expr)                                                        \
    do {                                                                   \
        if (!(expr)) { std::cerr << "  FAIL: " #expr "\n"; ++failed; }    \
        else { ++passed; }                                                 \
    } while (0)

// ---------------------------------------------------------------------------
// Test 1: Basic SET / GET / DEL
// ---------------------------------------------------------------------------
static void test_basic() {
    std::cout << "[Test] Basic SET / GET / DEL\n";
    CacheEngine cache(100);

    cache.set("name", "Sasank");
    cache.set("lang", "C++");

    CHECK(cache.get("name").value() == "Sasank");
    CHECK(cache.get("lang").value() == "C++");
    CHECK(!cache.get("missing").has_value());

    cache.set("name", "FastCache");  // update
    CHECK(cache.get("name").value() == "FastCache");

    CHECK(cache.del("name") == true);
    CHECK(!cache.get("name").has_value());
    CHECK(cache.del("nope") == false);
    CHECK(cache.size() == 1);
}

// ---------------------------------------------------------------------------
// Test 2: LRU Eviction
// ---------------------------------------------------------------------------
static void test_lru_eviction() {
    std::cout << "[Test] LRU Eviction\n";
    CacheEngine cache(3);

    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");  // full: [c, b, a]

    cache.get("a");        // promote a → [a, c, b]
    cache.set("d", "4");   // evicts b  → [d, a, c]

    CHECK(!cache.get("b").has_value());  // b was evicted
    CHECK(cache.get("a").value() == "1");
    CHECK(cache.get("c").value() == "3");
    CHECK(cache.get("d").value() == "4");
    CHECK(cache.size() == 3);
}

// ---------------------------------------------------------------------------
// Test 3: TTL Passive Expiration
// ---------------------------------------------------------------------------
static void test_ttl() {
    std::cout << "[Test] TTL Passive Expiration\n";
    CacheEngine cache(100);

    cache.set("temp", "val", 1);  // expires in 1 second
    CHECK(cache.get("temp").value() == "val");

    std::this_thread::sleep_for(std::chrono::milliseconds(1200));

    CHECK(!cache.get("temp").has_value());  // expired
}

// ---------------------------------------------------------------------------
// Test 4: Purge Expired
// ---------------------------------------------------------------------------
static void test_purge() {
    std::cout << "[Test] Purge Expired\n";
    CacheEngine cache(100);

    cache.set("k1", "v1", 1);
    cache.set("k2", "v2", 1);
    cache.set("k3", "v3");  // no TTL

    std::this_thread::sleep_for(std::chrono::milliseconds(1200));

    CHECK(cache.purge_expired() == 2);
    CHECK(cache.size() == 1);
    CHECK(cache.get("k3").value() == "v3");
}

// ---------------------------------------------------------------------------
// Test 5: Hit / Miss Counters
// ---------------------------------------------------------------------------
static void test_stats() {
    std::cout << "[Test] Hit / Miss Counters\n";
    CacheEngine cache(100);

    cache.set("x", "1");
    cache.get("x");       // hit
    cache.get("x");       // hit
    cache.get("nope");    // miss

    CHECK(cache.hits() == 2);
    CHECK(cache.misses() == 1);
}

// ---------------------------------------------------------------------------
// Test 6: Thread Safety
// ---------------------------------------------------------------------------
static void test_threads() {
    std::cout << "[Test] Thread Safety\n";
    CacheEngine cache(10000);

    constexpr int THREADS = 4;
    constexpr int OPS = 5000;

    auto worker = [&](int id) {
        for (int i = 0; i < OPS; ++i) {
            std::string key = "t" + std::to_string(id) + "_" + std::to_string(i);
            cache.set(key, "v");
            cache.get(key);
        }
    };

    std::vector<std::thread> threads;
    for (int i = 0; i < THREADS; ++i)
        threads.emplace_back(worker, i);
    for (auto& t : threads) t.join();

    CHECK(cache.size() <= 10000);
    std::cout << "  " << THREADS * OPS * 2 << " concurrent ops completed\n";
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------
static void benchmark() {
    std::cout << "\n[Benchmark] Throughput\n";
    CacheEngine cache(100000);
    constexpr int N = 100000;

    auto t1 = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < N; ++i)
        cache.set("k" + std::to_string(i), "v" + std::to_string(i));
    auto t2 = std::chrono::high_resolution_clock::now();
    double set_ms = std::chrono::duration<double, std::milli>(t2 - t1).count();

    auto t3 = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < N; ++i)
        cache.get("k" + std::to_string(i));
    auto t4 = std::chrono::high_resolution_clock::now();
    double get_ms = std::chrono::duration<double, std::milli>(t4 - t3).count();

    std::cout << "  SET: " << int((N / set_ms) * 1000) << " ops/sec\n";
    std::cout << "  GET: " << int((N / get_ms) * 1000) << " ops/sec\n";
}

// ---------------------------------------------------------------------------
int main() {
    std::cout << "============================================\n"
              << "  FastCache — Test Suite & Benchmark\n"
              << "============================================\n\n";

    test_basic();
    test_lru_eviction();
    test_ttl();
    test_purge();
    test_stats();
    test_threads();
    benchmark();

    std::cout << "\n============================================\n"
              << "  Results: " << passed << " passed, " << failed << " failed\n"
              << "============================================\n";

    return failed > 0 ? 1 : 0;
}
