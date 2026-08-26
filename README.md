# FastCache — In-Memory LRU Cache Engine & Visualizer

A high-performance in-memory key-value caching engine built in **C++17** with **O(1)** get/set/delete operations, LRU eviction, and TTL key expiration, paired with an interactive **React Web Visualizer**.

### 🌐 Live Demo
**Website:** [fast-cache-gjnba2a15-me-b39d.vercel.app](https://fast-cache-gjnba2a15-me-b39d.vercel.app)

---

## 🌟 Key Features

- **O(1) Cache Operations** — Hybrid `std::unordered_map` (Hash Map) + `std::list` (Doubly Linked List) for constant-time GET, SET, and DELETE.
- **LRU Eviction Policy** — Automatically evicts the least-recently-used entry when the cache reaches maximum capacity.
- **TTL Key Expiration** — Per-key Time-To-Live (seconds) with passive expiration on access.
- **Thread-Safe Concurrency** — `std::mutex` and `std::lock_guard` protect cache operations from race conditions.
- **Dual Interfaces:**
  - **Interactive C++ CLI REPL** for terminal power-users.
  - **Interactive React Web Visualizer** to inspect cache ordering, eviction lifecycles, and live TTL countdowns in real-time.

---

## 🛠️ Tech Stack

- **Core Engine:** C++17, Multithreading (`std::mutex`), CMake 3.16+
- **Web Visualizer:** React 18, Vite, Lucide Icons, Modern CSS

---

## 📁 Project Structure

```
FastCache/
├── include/
│   └── CacheEngine.hpp      # Core LRU cache (Hash Map + Doubly Linked List)
├── src/
│   ├── CacheEngine.cpp      # O(1) LRU eviction, passive TTL, mutex
│   └── main.cpp             # Interactive CLI REPL
├── tests/
│   └── benchmark.cpp        # 21 unit tests + ops/sec benchmark
├── web/                     # Interactive React Visualizer Dashboard
│   ├── src/
│   │   ├── core/
│   │   │   └── LRUCacheEngine.js  # 1:1 JS implementation of C++ engine
│   │   ├── App.jsx          # Live visualizer dashboard
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── CMakeLists.txt
├── vercel.json              # 1-click Vercel deployment configuration
└── README.md
```

---

## 🚀 Build & Execution Guide

### Option A: Run C++ Engine (CLI & Benchmark)

```bash
# 1. Build C++ Engine
mkdir build && cd build
cmake .. && make

# 2. Run Interactive Terminal REPL
./fastcache

# Try commands:
# fastcache> SET name Sasank
# fastcache> SET token abc123 EX 60
# fastcache> GET name
# fastcache> STATS
# fastcache> QUIT

# 3. Run Automated Tests & Benchmark
./fastcache_test
```

---

### Option B: Run Interactive Web Visualizer Dashboard

```bash
# Navigate to web dashboard
cd web

# Install dependencies
npm install

# Start development server (Runs on http://localhost:5173)
npm run dev
```

---

## ⚡ Architecture & Algorithm Complexity

```
  std::unordered_map (O(1) lookup)
  ┌──────────────────────────────┐
  │  "key_a" ──→ list iterator   │
  │  "key_b" ──→ list iterator   │
  └──────────────────────────────┘
                 │
                 ▼
  std::list — Doubly Linked List (O(1) reorder)
  ┌──────────────────────────────────────┐
  │ [MRU] ←→ key_b ←→ key_a ←→ [LRU]   │
  │                                      │
  │  GET  → promotes to front (MRU)      │
  │  SET  → inserts at front (MRU)       │
  │  Full → evicts from back (LRU)       │
  └──────────────────────────────────────┘
```

| Operation | Time Complexity | Space Complexity |
|---|:---:|:---:|
| **GET** | O(1) | O(1) |
| **SET** | O(1) | O(1) |
| **DEL** | O(1) | O(1) |
| **LRU Eviction** | O(1) | O(1) |
| **TTL Clean** | O(N) | O(1) |

---

## 📄 License
MIT License
