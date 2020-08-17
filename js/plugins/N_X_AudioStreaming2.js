/*:
 * @plugindesc v1.00 (Requires AudioStreaming) Move audio decoding to audio worklet.
 * @author Think_Nathan
 *
 * @help No plugin commands. Requires AudioStreaming.js by krmbn0576 (くらむぼん)
 * https://forums.rpgmakerweb.com/index.php?threads/audiostreaming-js-plugin-to-improve-rpg-maker-mv-audio-performance.110063/
 */

var stbvorbis = typeof stbvorbis !== "undefined" ? stbvorbis : {};
(function () {
    function httpGet(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url);
            xhr.addEventListener("load", function () {
                var status = xhr.status;
                if (status < 200 || status >= 300) {
                    reject({
                        status: status
                    });
                    return
                }
                resolve(xhr.response)
            });
            xhr.addEventListener("error", function () {
                reject({
                    status: xhr.status
                })
            });
            xhr.send()
        })
    }
    var initializeWorkerP = new Promise(function (resolve, reject) {
        if (typeof WebAssembly === "object" && !(navigator.userAgent.match(/iPhone|iPad|iPod/) && navigator.userAgent.match(/AppleWebKit/))) {

            /*
            var workerURL = URL.createObjectURL(new Blob(["(" + decodeWorker.toString() + ")();"], {
                type: "text/javascript"
            }));
            resolve(new Worker(workerURL));
            */

            let context = WebAudio._context || new AudioContext();
            resolve(
                context.audioWorklet.addModule('./js/plugins/worklet-vorbis.js').then(function () {
                    const worker = new AudioWorkletNode(context, 'worklet-audio-processor');
                    worker.connect(context.destination);
                    window.worker = worker;
                    return worker.port;
                })
            );

            return
        }

        var scriptPath = document.currentScript.src;
        var directoryPath = scriptPath.slice(0, scriptPath.lastIndexOf("/") + 1);
        httpGet(directoryPath + "stbvorbis_stream_asm.js").then(function (script) {
            workerURL = URL.createObjectURL(new Blob([script], {
                type: "text/javascript"
            }));
            resolve(new Worker(workerURL))
        }).catch(function (err) {
            reject(new Error("asmjs version is not available (HTTP status: " + err.status + " on stbvorbis_stream_asm.js). Deploy stbvorbis_stream_asm.js at the same place as stbvorbis.js."))
        })

    });
    initializeWorkerP.catch(function (e) {
        console.warn(e);
    });
    stbvorbis.decode = function (buf, outCallback) {
        var inCallback = stbvorbis.decodeStream(outCallback);
        inCallback({
            data: buf,
            eof: false
        });
        inCallback({
            data: null,
            eof: true
        })
    };
    var sessionId = 0;
    var outCallbacks = {};
    stbvorbis.decodeStream = function (outCallback) {
        var inCallbackImpl = null;
        var inputQueue = [];
        var inCallback = function (input) {
            if (!inCallbackImpl) {
                inputQueue.push(input);
                return
            }
            inCallbackImpl(input)
        };
        initializeWorkerP.then(function (worker) {
            var currentId = sessionId;
            sessionId++;
            var sampleRate = 0;
            var data = [];
            var onmessage = function (event) {
                var result = event.data;
                if (result.id !== currentId) {
                    return
                }
                if (result.error) {
                    outCallback({
                        data: null,
                        sampleRate: 0,
                        eof: false,
                        error: result.error
                    });
                    worker.onmessage = null;
                    return
                }
                if (result.eof) {
                    outCallback({
                        data: null,
                        sampleRate: 0,
                        eof: true,
                        error: null
                    });
                    worker.onmessage = null;
                    return
                }
                outCallback({
                    data: result.data,
                    sampleRate: result.sampleRate,
                    eof: false,
                    error: null
                })
            };
            worker.onmessage = onmessage;
            inCallbackImpl = function (input) {
                if (input.eof) {
                    worker.postMessage({
                        id: currentId,
                        buf: null,
                        eof: true
                    });
                    return
                }
                var buf = input.data;
                worker.postMessage({
                    id: currentId,
                    buf: buf,
                    eof: false
                }, [buf instanceof Uint8Array ? buf.buffer : buf])
            };
            for (var i = 0; i < inputQueue.length; i++) {
                inCallbackImpl(inputQueue[i])
            }
            inputQueue = null
        });
        return inCallback
    }
})();
