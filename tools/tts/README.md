# Recording Pip's voice

The app plays pre-recorded clips (no speech engine on the device).

1. `npx vitest run scripts/harvest` collects every line the app can say (`scripts/out/speech.json`).
2. `npx vitest run scripts/units` turns it into the clip list (`scripts/out/units.json`).
3. `python tools/tts/render.py scripts/out/units.json <clips dir> <voice> <speed>` records the clips with Kokoro
   (model files from https://github.com/thewh1teagle/kokoro-onnx/releases).
4. `python tools/tts/pack.py <clips dir> public/voice/af_heart 8` packs them into 8 bundles + manifest.
5. `npx vitest run scripts/coverage` checks every line can be played from recordings.

Without `public/voice/.../manifest.json` the app falls back to the iPad's built-in voice.
