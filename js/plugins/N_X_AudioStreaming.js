/*:
 * @plugindesc v1.00 (Requires AudioStreaming) Move audio decoding to web worker.
 * @author Think_Nathan
 *
 * @help No plugin commands. Requires AudioStreaming.js by Kurambon (くらむぼん)
 * https://forums.rpgmakerweb.com/index.php?threads/audiostreaming-js-plugin-to-improve-rpg-maker-mv-audio-performance.110063/
 */

if (window.Worker) {
    WebAudio.prototype._loading = async function (reader) {
        const context = this;
        try {
            const worker = new Worker('./js/plugins/worker-stbvorbis-stream.js');
            const decodeAudio = (eof, data) => {
                if (data) {
                    worker.postMessage({
                        eof: eof,
                        data: data
                    }, [data.buffer]);
                } else {
                    worker.postMessage({
                        eof: eof
                    });
                }
            };
            const handleDecodedAudio = (msg) => {
                if (msg && msg.data) {
                    context._onDecode(msg.data);
                }
            }

            worker.onmessage = handleDecodedAudio;

            while (true) {
                const {
                    done,
                    value
                } = await reader.read();

                if (done) {
                    decodeAudio(true);
                    return;
                }
                let array = value;

                this._readLoopComments(array);
                decodeAudio(false, array);
            }

        } catch (error) {
            console.error(error);
            const autoPlay = this._autoPlay;
            const loop = this._loop;
            const pos = this.seek();
            this.initialize(this._url);
            if (autoPlay) {
                this.play(loop, pos);
            }
        }
    }
};
