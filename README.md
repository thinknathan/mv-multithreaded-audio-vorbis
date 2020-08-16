# mv-multithreaded-audio
RPG Maker MV Plugin that uses web workers to decode Vorbis audio stream

## Goal
AudioStreaming.js is a plugin that streams Vorbis audio files. One flaw it has is that in non-Chromium browsers, it introduces significant noise and clicking.

So far I've attempted to offload some of the work onto a web worker to see if that helps. No luck so far.

## Credits
AudioStreaming.js (C) krmbn0576 (くらむぼん)
stbvorbis.js (C) Hajime Hoshi, krmbn0576
