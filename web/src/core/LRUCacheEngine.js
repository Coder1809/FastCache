/**
 * LRUCacheEngine
 * 1:1 JavaScript simulation of our C++17 CacheEngine
 * Architecture:
 *   - Map (Hash Map) for O(1) Key -> Node lookup
 *   - Doubly Linked List for O(1) MRU promotion & LRU eviction
 */

class Node {
  constructor(key, value, ttlSeconds = null) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    this.ttlMs = ttlSeconds ? ttlSeconds * 1000 : null;
    this.expiresAt = this.ttlMs ? this.createdAt + this.ttlMs : null;
    this.prev = null;
    this.next = null;
  }

  isExpired() {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt;
  }

  getRemainingSeconds() {
    if (!this.expiresAt) return null;
    const remaining = Math.ceil((this.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }
}

export class LRUCacheEngine {
  constructor(capacity = 5) {
    this.capacity = capacity;
    this.map = new Map(); // key -> Node
    
    // Sentinel nodes for doubly linked list
    this.head = new Node(null, null); // MRU side
    this.tail = new Node(null, null); // LRU side
    this.head.next = this.tail;
    this.tail.prev = this.head;

    this.hits = 0;
    this.misses = 0;
  }

  setCapacity(newCapacity) {
    this.capacity = Math.max(1, newCapacity);
    const evicted = [];
    while (this.map.size > this.capacity) {
      const node = this._removeTail();
      if (node) {
        this.map.delete(node.key);
        evicted.push(node);
      }
    }
    return evicted;
  }

  _addToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }

  _removeTail() {
    if (this.tail.prev === this.head) return null;
    const lruNode = this.tail.prev;
    this._removeNode(lruNode);
    return lruNode;
  }

  set(key, value, ttlSeconds = null) {
    let evicted = null;
    let isUpdate = false;

    if (this.map.has(key)) {
      const existing = this.map.get(key);
      existing.value = value;
      existing.createdAt = Date.now();
      existing.ttlMs = ttlSeconds ? ttlSeconds * 1000 : null;
      existing.expiresAt = existing.ttlMs ? existing.createdAt + existing.ttlMs : null;
      this._moveToHead(existing);
      isUpdate = true;
      return { status: 'OK', isUpdate, evicted, node: existing };
    }

    if (this.map.size >= this.capacity) {
      evicted = this._removeTail();
      if (evicted) {
        this.map.delete(evicted.key);
      }
    }

    const newNode = new Node(key, value, ttlSeconds);
    this._addToHead(newNode);
    this.map.set(key, newNode);

    return { status: 'OK', isUpdate, evicted, node: newNode };
  }

  get(key) {
    if (!this.map.has(key)) {
      this.misses++;
      return { found: false, value: null, expired: false };
    }

    const node = this.map.get(key);

    if (node.isExpired()) {
      this._removeNode(node);
      this.map.delete(key);
      this.misses++;
      return { found: false, value: null, expired: true, key };
    }

    this._moveToHead(node);
    this.hits++;
    return { found: true, value: node.value, node };
  }

  del(key) {
    if (!this.map.has(key)) {
      return false;
    }
    const node = this.map.get(key);
    this._removeNode(node);
    this.map.delete(key);
    return true;
  }

  purgeExpired() {
    const purged = [];
    let current = this.head.next;
    while (current !== this.tail) {
      const next = current.next;
      if (current.isExpired()) {
        this._removeNode(current);
        this.map.delete(current.key);
        purged.push(current.key);
      }
      current = next;
    }
    return purged;
  }

  clear() {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.hits = 0;
    this.misses = 0;
  }

  // Returns list in order from MRU (head) to LRU (tail)
  getEntries() {
    const entries = [];
    let current = this.head.next;
    while (current !== this.tail) {
      entries.push({
        key: current.key,
        value: current.value,
        createdAt: current.createdAt,
        expiresAt: current.expiresAt,
        ttlSeconds: current.getRemainingSeconds(),
        isExpired: current.isExpired(),
      });
      current = current.next;
    }
    return entries;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0.0';
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }
}
