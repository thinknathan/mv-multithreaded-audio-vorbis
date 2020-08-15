importScripts('stbvorbis_stream.js');

// Initialize the decoder
const decoder = stbvorbis.decodeStream(result => sendToOnDecode(result));

// Decode incoming data
// Expected input type: object
// object.eof   = BOOLEAN,
// object.data  = Uint8Array
function runDecoder(payload) {
    if (payload && payload.eof === true) {
        decoder({
            eof: true
        });
    } else {
        decoder({
            data: payload.data,
            eof: false
        });
    }
};

// Send decoded data
// @returns object
// object.data       = Array,
// object.data[0]    = Float32Array,
// object.data[1]    = Float32Array,
// object.eof        = BOOLEAN,
// object.error      = NULL,
// object.sampleRate = INT
function sendToOnDecode(data) {
    self.postMessage(data);
};

// Handle incoming messages
self.onmessage = function (msg) {
    var payload = msg.data;
    if (payload) {
        runDecoder(payload);
    }
};
