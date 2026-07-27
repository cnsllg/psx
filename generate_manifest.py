#!/usr/bin/env python3
import os

PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
MANIFEST_PATH = os.path.join(PUBLIC_DIR, "cache.manifest")

# Files or directory names to exclude from cache.manifest
EXCLUDE = {
    "cache.manifest",
    "sw.js",
    ".DS_Store",
    "thumbs.db"
}

def generate_manifest():
    cached_files = []

    for root, dirs, files in os.walk(PUBLIC_DIR):
        for file in sorted(files):
            if file in EXCLUDE or file.startswith("."):
                continue
            
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, PUBLIC_DIR).replace("\\", "/")
            cached_files.append(rel_path)

    cached_files.sort()

    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    content = f"CACHE MANIFEST\n# Generated at {timestamp}\n\nCACHE:\n"
    content += "\n".join(cached_files)
    content += "\n\nNETWORK:\n*\n"

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[+] Successfully generated {MANIFEST_PATH} with {len(cached_files)} files:")
    for file in cached_files:
        print(f"  - {file}")

if __name__ == "__main__":
    generate_manifest()
