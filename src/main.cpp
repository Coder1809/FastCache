#include "CacheEngine.hpp"

#include <iostream>
#include <sstream>
#include <string>

using namespace fastcache;

static void print_help() {
    std::cout << "\nCommands:\n"
              << "  SET <key> <value> [EX seconds]  — Store a key-value pair\n"
              << "  GET <key>                       — Retrieve value by key\n"
              << "  DEL <key>                       — Delete a key\n"
              << "  STATS                           — Show cache statistics\n"
              << "  CLEAN                           — Remove all expired keys\n"
              << "  HELP                            — Show this help\n"
              << "  QUIT                            — Exit\n\n";
}

int main() {
    CacheEngine cache(10000);

    std::cout << "============================================\n"
              << "  FastCache v1.0.0\n"
              << "  In-Memory LRU Cache Engine (C++17)\n"
              << "============================================\n";
    print_help();

    std::string line;
    std::cout << "fastcache> ";

    while (std::getline(std::cin, line)) {
        if (line.empty()) {
            std::cout << "fastcache> ";
            continue;
        }

        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;

        // Upper-case the command.
        for (auto& c : cmd) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));

        if (cmd == "SET") {
            std::string key, value;
            iss >> key >> value;
            if (key.empty() || value.empty()) {
                std::cout << "(error) usage: SET key value [EX seconds]\n";
            } else {
                std::optional<int> ttl;
                std::string ex_flag;
                if (iss >> ex_flag) {
                    for (auto& c : ex_flag) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
                    if (ex_flag == "EX") {
                        int secs;
                        if (iss >> secs) ttl = secs;
                    }
                }
                cache.set(key, value, ttl);
                std::cout << "OK\n";
            }
        }
        else if (cmd == "GET") {
            std::string key;
            iss >> key;
            if (key.empty()) {
                std::cout << "(error) usage: GET key\n";
            } else {
                auto val = cache.get(key);
                std::cout << (val.has_value() ? val.value() : "(nil)") << "\n";
            }
        }
        else if (cmd == "DEL") {
            std::string key;
            iss >> key;
            if (key.empty()) {
                std::cout << "(error) usage: DEL key\n";
            } else {
                std::cout << (cache.del(key) ? "1" : "0") << "\n";
            }
        }
        else if (cmd == "STATS") {
            std::cout << "  Keys:     " << cache.size() << " / " << cache.capacity() << "\n"
                      << "  Hits:     " << cache.hits() << "\n"
                      << "  Misses:   " << cache.misses() << "\n";
        }
        else if (cmd == "CLEAN" || cmd == "PURGE" || cmd == "REMOVE-EXPIRED") {
            auto n = cache.purge_expired();
            std::cout << "Removed " << n << " expired entries\n";
        }
        else if (cmd == "HELP") {
            print_help();
        }
        else if (cmd == "QUIT" || cmd == "EXIT") {
            std::cout << "Bye!\n";
            break;
        }
        else {
            std::cout << "(error) unknown command: " << cmd << "\n";
        }

        std::cout << "fastcache> ";
    }

    return 0;
}
