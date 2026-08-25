#pragma once

#include <chrono>
#include <cstddef>
#include <list>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>

namespace fastcache {

/**
 * @brief A single cached key-value entry with optional TTL.
 */
struct CacheEntry {
    std::string key;
    std::string value;
    std::chrono::steady_clock::time_point created_at;
    std::optional<std::chrono::seconds> ttl;  // nullopt = no expiration

    bool is_expired() const {
        if (!ttl.has_value()) return false;
        return std::chrono::steady_clock::now() > created_at + ttl.value();
    }
};

/**
 * @brief O(1) LRU Cache using Hash Map + Doubly Linked List.
 *
 * - std::unordered_map  maps key -> list iterator   (O(1) lookup)
 * - std::list           maintains access order       (O(1) eviction/promotion)
 *   Front = Most Recently Used,  Back = Least Recently Used
 *
 * Thread safety: std::mutex protects all operations.
 */
class CacheEngine {
public:
    explicit CacheEngine(std::size_t max_capacity = 10000);

    /// Store a key-value pair. Evicts LRU entry if at capacity.
    void set(const std::string& key, const std::string& value,
             std::optional<int> ttl_seconds = std::nullopt);

    /// Retrieve value by key. Returns nullopt on miss or expiration.
    std::optional<std::string> get(const std::string& key);

    /// Delete a key. Returns true if it existed.
    bool del(const std::string& key);

    /// Remove all expired entries. Returns count purged.
    std::size_t purge_expired();

    std::size_t size() const;
    std::size_t capacity() const;
    uint64_t    hits() const;
    uint64_t    misses() const;

private:
    void evict_lru();

    const std::size_t max_capacity_;
    std::list<CacheEntry> order_;                                        // front=MRU, back=LRU
    std::unordered_map<std::string, std::list<CacheEntry>::iterator> index_;  // key -> node
    mutable std::mutex mutex_;
    uint64_t hits_   = 0;
    uint64_t misses_ = 0;
};

}  // namespace fastcache
