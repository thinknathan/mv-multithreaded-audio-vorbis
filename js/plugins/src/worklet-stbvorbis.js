import Module from '/js/plugins/stbvorbis-module.js';

class AudioCopyProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this.sessions = {};
        this.port.onmessage = this.handleMessage.bind(this);
        this.initializeP = new Promise(function (resolve) {
            if (typeof useWasm !== "undefined") {
                Module.onRuntimeInitialized = function () {
                    var fs = {};
                    fs.open = Module.cwrap("stb_vorbis_js_open", "number", []);
                    fs.close = Module.cwrap("stb_vorbis_js_close", "void", ["number"]);
                    fs.channels = Module.cwrap("stb_vorbis_js_channels", "number", ["number"]);
                    fs.sampleRate = Module.cwrap("stb_vorbis_js_sample_rate", "number", ["number"]);
                    fs.decode = Module.cwrap("stb_vorbis_js_decode", "number", ["number", "number", "number", "number", "number"]);
                    resolve(fs)
                };
                return
            }
            var fs = {};
            fs.open = Module["_stb_vorbis_js_open"];
            fs.close = Module["_stb_vorbis_js_close"];
            fs.channels = Module["_stb_vorbis_js_channels"];
            fs.sampleRate = Module["_stb_vorbis_js_sample_rate"];
            fs.decode = Module["_stb_vorbis_js_decode"];
            resolve(fs)
        });
    };

    arrayBufferToHeap(buffer, byteOffset, byteLength) {
        var ptr = Module._malloc(byteLength);
        var heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, byteLength);
        heapBytes.set(new Uint8Array(buffer, byteOffset, byteLength));
        return heapBytes
    }

    ptrToInt32(ptr) {
        var a = new Int32Array(Module.HEAPU8.buffer, ptr, 1);
        return a[0]
    }

    ptrToFloat32(ptr) {
        var a = new Float32Array(Module.HEAPU8.buffer, ptr, 1);
        return a[0]
    }

    ptrToInt32s(ptr, length) {
        var buf = new ArrayBuffer(length * Int32Array.BYTES_PER_ELEMENT);
        var copied = new Int32Array(buf);
        copied.set(new Int32Array(Module.HEAPU8.buffer, ptr, length));
        return copied
    }

    ptrToFloat32s(ptr, length) {
        var buf = new ArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT);
        var copied = new Float32Array(buf);
        copied.set(new Float32Array(Module.HEAPU8.buffer, ptr, length));
        return copied
    }

    concatArrays(arr1, arr2) {
        if (!arr1) {
            arr1 = new ArrayBuffer
        }
        if (!arr2) {
            arr2 = new ArrayBuffer
        }
        var newArr = new Uint8Array(arr1.byteLength + arr2.byteLength);
        if (arr1 instanceof ArrayBuffer) {
            newArr.set(new Uint8Array(arr1), 0)
        } else if (arr1 instanceof Uint8Array) {
            newArr.set(arr1, 0)
        } else {
            throw "not reached"
        }
        if (arr2 instanceof ArrayBuffer) {
            newArr.set(new Uint8Array(arr2), arr1.byteLength)
        } else if (arr2 instanceof Uint8Array) {
            newArr.set(arr2, arr1.byteLength)
        } else {
            throw "not reached"
        }
        return newArr
    }

    handleMessage(event) {
        const self = this;
        this.initializeP.then(function (funcs) {
            var statePtr = null;
            if (event.data.id in self.sessions) {
                statePtr = self.sessions[event.data.id].state
            } else {
                statePtr = funcs.open();
                self.sessions[event.data.id] = {
                    state: statePtr,
                    input: null
                }
            }
            self.sessions[event.data.id].input = self.concatArrays(self.sessions[event.data.id].input, event.data.buf);
            while (self.sessions[event.data.id].input.byteLength > 0) {
                var input = self.sessions[event.data.id].input;
                var copiedInput = null;
                var chunkLength = Math.min(65536, input.byteLength);
                if (input instanceof ArrayBuffer) {
                    copiedInput = self.arrayBufferToHeap(input, 0, chunkLength)
                } else if (input instanceof Uint8Array) {
                    copiedInput = self.arrayBufferToHeap(input.buffer, input.byteOffset, chunkLength)
                }
                var outputPtr = Module._malloc(4);
                var readPtr = Module._malloc(4);
                var length = funcs.decode(
                    statePtr, 
                    copiedInput.byteOffset,
                    copiedInput.byteLength, 
                    outputPtr, 
                    readPtr
                );
                
                Module._free(copiedInput.byteOffset);
                var read = self.ptrToInt32(readPtr);
                Module._free(readPtr);
                
                self.sessions[event.data.id].input = input.slice(read);
                var result = {
                    id: event.data.id,
                    data: null,
                    sampleRate: 0,
                    eof: false,
                    error: null
                };
                if (length < 0) {
                    result.error = "stbvorbis decode failed: " + length;
                    self.port.postMessage(result);
                    funcs.close(statePtr);
                    delete self.sessions[event.data.id];
                    Module._free(outputPtr);
                    return
                }
                var channels = funcs.channels(statePtr);
                if (channels > 0) {
                    var dataPtrs = self.ptrToInt32s(self.ptrToInt32(outputPtr), channels);
                    result.data = new Array(dataPtrs.length);
                    for (var i = 0; i < dataPtrs.length; i++) {
                        result.data[i] = self.ptrToFloat32s(dataPtrs[i], length);
                        Module._free(dataPtrs[i])
                    }
                }
                Module._free(self.ptrToInt32(outputPtr));
                Module._free(outputPtr);
                
                if (read === 0) {
                    break
                }
                
                if (result.sampleRate === 0) {
                    result.sampleRate = funcs.sampleRate(statePtr)
                }
                self.port.postMessage(result, result.data.map(function (array) {
                    return array.buffer
                }))
            }
            if (event.data.eof) {
                var len = self.sessions[event.data.id].input.length;
                if (len) {
                    console.warn("not all the input data was decoded. remaining: " + len + "[bytes]")
                }
                var result = {
                    id: event.data.id,
                    data: null,
                    sampleRate: 0,
                    eof: true,
                    error: null
                };
                self.port.postMessage(result);
                funcs.close(statePtr);
                delete self.sessions[event.data.id]
            }
        })
    };

    process() {
        return true;
    };
};

registerProcessor("worklet-audio-processor", AudioCopyProcessor);
