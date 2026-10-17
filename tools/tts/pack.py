"""Pack individual MP3 clips into a few bundle files + a manifest of byte ranges."""
import json, os, sys, shutil
SRC, DST, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
m = json.load(open(os.path.join(SRC, "manifest.json")))
keys = sorted(m)
os.makedirs(DST, exist_ok=True)
for f in os.listdir(DST):
    if f.startswith("pack") or f == "manifest.json": os.remove(os.path.join(DST, f))
per = (len(keys) + N - 1) // N
out = {"b": [], "k": {}}
for bi in range(N):
    name = f"pack{bi}.mp3"
    out["b"].append(name)
    off = 0
    with open(os.path.join(DST, name), "wb") as fh:
        for k in keys[bi * per:(bi + 1) * per]:
            data = open(os.path.join(SRC, m[k]), "rb").read()
            fh.write(data)
            out["k"][k] = [bi, off, len(data)]
            off += len(data)
json.dump(out, open(os.path.join(DST, "manifest.json"), "w"), separators=(",", ":"))
total = sum(os.path.getsize(os.path.join(DST, f)) for f in out["b"])
print("packed", len(keys), "clips into", N, "bundles,", round(total / 1e6, 1), "MB")
