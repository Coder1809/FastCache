#include "CacheEngine.hpp"

namespace fastcache {

CacheEngine::CacheEngine(std::size_t max_capacity)
    : max_capacity_(max_capacity == 0 ? 1 : max_capacity) {}

// ---------------------------------------------------------------------------
// SET — O(1)
// ---------------------------------------------------------------------------
void CacheEngine::set(const std::string& key, const std::string& value,
                      std::optional<int> ttl_seconds) {
    std::lock_guard<std::mutex> lock(mutex_);

    auto it = index_.find(key);

    if (it != index_.end()) {
        // Key exists — update value, reset TTL, promote to MRU.
        auto list_it = it->second;
        list_it->value = value;
        list_it->created_at = std::chrono::steady_clock::now();
        list_it->ttl = (ttl_seconds.has_value() && ttl_seconds.value() > 0)
                           ? std::optional<std::chrono::seconds>(std::chrono::seconds(ttl_seconds.value()))
                           : std::nullopt;
        order_.splice(order_.begin(), order_, list_it);  // move to front (MRU)
        return;
    }

    // At capacity — evict LRU (back of list).
    if (order_.size() >= max_capacity_) {
        evict_lru();
    }

    // Insert new entry at front (MRU).
    CacheEntry entry;
    entry.key = key;
    entry.value = value;
    entry.created_at = std::chrono::steady_clock::now();
    entry.ttl = (ttl_seconds.has_value() && ttl_seconds.value() > 0)
                    ? std::optional<std::chrono::seconds>(std::chrono::seconds(ttl_seconds.value()))
                    : std::nullopt;

    order_.push_front(std::move(entry));
    index_[key] = order_.begin();
}

// ---------------------------------------------------------------------------
// GET — O(1)
// ---------------------------------------------------------------------------
std::optional<std::string> CacheEngine::get(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);

    auto it = index_.find(key);
    if (it == index_.end()) {
        ++misses_;
        return std::nullopt;
    }

    auto list_it = it->second;

    // Passive TTL check.
    if (list_it->is_expired()) {
        index_.erase(it);
        order_.erase(list_it);
        ++misses_;
        return std::nullopt;
    }

    // Hit — promote to MRU.
    order_.splice(order_.begin(), order_, list_it);
    ++hits_;
    return list_it->value;
}

// ---------------------------------------------------------------------------
// DEL — O(1)
// ---------------------------------------------------------------------------
bool CacheEngine::del(const std::string& key) {
    std::lock_guard<std::mutex> lock(mutex_);

    auto it = index_.find(key);
    if (it == index_.end()) return false;

    order_.erase(it->second);
    index_.erase(it);
    return true;
}

// ---------------------------------------------------------------------------
// Purge all expired entries
// ---------------------------------------------------------------------------
std::size_t CacheEngine::purge_expired() {
    std::lock_guard<std::mutex> lock(mutex_);

    std::size_t count = 0;
    auto it = order_.begin();
    while (it != order_.end()) {
        if (it->is_expired()) {
            index_.erase(it->key);
            it = order_.erase(it);
            ++count;
        } else {
            ++it;
        }
    }
    return count;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
std::size_t CacheEngine::size() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return order_.size();
}

std::size_t CacheEngine::capacity() const { return max_capacity_; }

uint64_t CacheEngine::hits() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return hits_;
}

uint64_t CacheEngine::misses() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return misses_;
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------
void CacheEngine::evict_lru() {
    if (order_.empty()) return;
    index_.erase(order_.back().key);
    order_.pop_back();
}

}  // namespace fastcache
