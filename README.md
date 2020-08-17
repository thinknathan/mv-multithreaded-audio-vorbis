# mv-multithreaded-audio-vorbis
RPG Maker MV plugin that uses an Audio Worklet to decode an ogg/vorbis audio stream.

## Goal
AudioStreaming.js is a plugin that streams ogg/vorbis audio files. Unfortunately, it introduces significant noise and clicking artifacts into the audio. This problem is worse in non-Chromium browsers.

I've ported the original code from using a web worker to using an audio worklet. More work is needed to address the noise problems.

## Credits
- AudioStreaming.js (C) krmbn0576 (くらむぼん)
- stbvorbis.js (C) Hajime Hoshi, krmbn0576
