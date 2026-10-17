"""Pre-record every phrase the app speaks with a natural Kokoro voice (MP3, 24 kbps mono)."""
import hashlib, json, os, sys
from multiprocessing import Pool
import numpy as np

UNITS, OUT, VOICE, SPEED = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
SEMIS = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
os.makedirs(OUT, exist_ok=True)
kk = None

def init():
    global kk
    import onnxruntime as ort
    from kokoro_onnx import Kokoro
    so = ort.SessionOptions(); so.intra_op_num_threads = 1; so.inter_op_num_threads = 1
    sess = ort.InferenceSession("kokoro-v1.0.int8.onnx", so, providers=["CPUExecutionProvider"])
    kk = Kokoro.from_session(sess, "voices-v1.0.bin")

def style():
    if '+' in VOICE:
        a, b = VOICE.split('+'); return 0.5 * kk.get_voice_style(a) + 0.5 * kk.get_voice_style(b)
    return VOICE

def fname(key): return hashlib.sha1(key.encode()).hexdigest()[:12] + ".mp3"

def trim(x, sr):
    a = np.abs(x); idx = np.where(a > 0.012)[0]
    if len(idx) == 0: return x
    pad = int(0.03 * sr)
    return x[max(0, idx[0] - pad): min(len(x), idx[-1] + pad)]

def work(item):
    key, text = item
    path = os.path.join(OUT, fname(key))
    if os.path.exists(path): return key, fname(key), 0
    import lameenc
    try:
        s, sr = kk.create(text, voice=style(), speed=SPEED, lang="en-us")
        if SEMIS:
            import librosa
            s = librosa.effects.pitch_shift(s.astype(np.float32), sr=sr, n_steps=SEMIS)
    except Exception as e:
        return key, None, str(e)
    s = trim(s, sr)
    enc = lameenc.Encoder(); enc.set_bit_rate(24); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
    mp3 = enc.encode((np.clip(s, -1, 1) * 32767).astype(np.int16).tobytes()) + enc.flush()
    with open(path, "wb") as f: f.write(mp3)
    return key, fname(key), len(s) / sr

if __name__ == "__main__":
    units = json.load(open(UNITS))
    manifest, secs, errs = {}, 0.0, []
    with Pool(4, initializer=init) as p:
        for i, (key, f, d) in enumerate(p.imap_unordered(work, units, chunksize=8)):
            if f: manifest[key] = f
            else: errs.append((key, d))
            if isinstance(d, float): secs += d
            if i % 200 == 0: print(i, len(units), f"{secs/60:.1f} min audio", flush=True)
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), separators=(",", ":"))
    print("done", len(manifest), "errors", len(errs), errs[:5], flush=True)
