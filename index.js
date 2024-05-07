"use strict";
const speech = require("@google-cloud/speech");
const speechClient = new speech.SpeechClient();
const { Writable } = require("stream");
const events = require("events");
const _ = require("lodash");
const uuid = require('uuid');
const audioFormat2audioEncoding = (af) => {
    if (af == 1) {
        return "LINEAR16";
    }
    else if (af == 7) {
        return "MULAW";
    }
    return "";
};
var Action;
(function (Action) {
    Action[Action["START_RECOG"] = 0] = "START_RECOG";
    Action[Action["SHUTDOWN"] = 1] = "SHUTDOWN";
})(Action || (Action = {}));
const add_evt_listeners = (evtEmitter, listeners) => {
    var _a;
    evtEmitter.my_listeners = (_a = evtEmitter.my_listeners) !== null && _a !== void 0 ? _a : [];
    listeners.forEach(([evt_name, evt_cb]) => {
        evtEmitter.on(evt_name, evt_cb);
        evtEmitter.my_listeners.push([evt_name, evt_cb]);
    });
};
const remove_evt_listeners = (evtEmitter) => {
    evtEmitter.my_listeners.forEach((listener) => {
        const [evt_name, evt_cb] = listener;
        evtEmitter.removeListener(evt_name, evt_cb);
    });
    evtEmitter.my_listeners = [];
};
const update = (state, action) => {
    switch (action) {
        case Action.START_RECOG: {
            //console.log("START_RECOG")
            var recognizeStream = state.recognizeStream;
            if (recognizeStream) {
                remove_evt_listeners(recognizeStream);
                recognizeStream.end();
            }
            recognizeStream = null;
            var request = state.params.request;
            if (!request) {
                request = {
                    single_utterance: true,
                };
            }
            if (!request.config) {
                request.config = {};
            }
            if (!request.config.encoding) {
                const audioEncoding = audioFormat2audioEncoding(state.format.audioFormat);
                if (!audioEncoding) {
                    setTimeout(() => {
                        state.eventEmitter.emit('error', 'unsupported_audio_format');
                    }, 0);
                    return Object.assign(Object.assign({}, state), { recognizeStream });
                }
                request.config.encoding = audioEncoding;
            }
            if (!request.config.sampleRateHertz) {
                request.config.sampleRateHertz = state.format.sampleRate;
            }
            if (!request.config.langugeCode) {
                request.config.languageCode = state.params.language;
            }
            //console.log("gsrs request", request)
            const on_error = (error) => {
                var err_msg = `recognizeStream error: ${error}`;
                console.log("on_error", error);
                state.eventEmitter.emit("error", err_msg);
            };
            const on_data = (data) => {
                var transcript = data.results && data.results[0]
                    ? data.results[0].alternatives[0].transcript
                    : "";
                var confidence = data.results && data.results[0]
                    ? data.results[0].alternatives[0].confidence
                    : 0;
                if (!data.results)
                    return;
                if (!data.results[0])
                    return;
                state.eventEmitter.emit('speech', {
                    transcript: transcript,
                    confidence: confidence,
                    full_details: data,
                });
                if (_.some(data.results, (r) => r.isFinal)) {
                    state.eventEmitter.emit('isFinalDetected');
                }
            };
            const on_close = () => {
                console.log("on_close");
                var err_msg = `recognizeStream closed`;
                state.eventEmitter.emit("error", err_msg);
            };
            recognizeStream = speechClient
                .streamingRecognize(request);
            add_evt_listeners(recognizeStream, [
                ["error", on_error],
                ["data", on_data],
                ["close", on_close]
            ]);
            setTimeout(() => {
                state.eventEmitter.emit("ready");
            }, 0);
            return Object.assign(Object.assign({}, state), { recognizeStream });
        }
        case Action.SHUTDOWN: {
            //console.log("SHUTDOWN")
            if (state.recognizeStream) {
                remove_evt_listeners(state.recognizeStream);
                state.recognizeStream.end();
            }
            return Object.assign(Object.assign({}, state), { recognizeStream: null });
        }
    }
};
class GoogleSpeechRecogStream extends Writable {
    constructor(opts) {
        super();
        this.state = {
            uuid: opts.uuid ? opts.uuid : uuid.v4(),
            format: opts.format,
            params: opts.params,
            config: opts.config,
            eventEmitter: new events.EventEmitter(),
            recognizeStream: null,
        };
        this.state = update(this.state, Action.START_RECOG);
        this.buffer = Buffer.alloc(0);
    }
    on(evt, cb) {
        super.on(evt, cb);
        this.state.eventEmitter.on(evt, cb);
    }
    _write(data, enc, callback) {
        //console.log("_write", data)
        if (this.state.recognizeStream) {
            if (this.buffer.length > 0) {
                this.state.recognizeStream.write(this.buffer);
                this.buffer = Buffer.alloc(0);
            }
            this.state.recognizeStream.write(data);
        }
        else {
            this.buffer = Buffer.concat([this.buffer, data]);
        }
        callback();
        return true;
    }
    _final(callback) {
        console.log("gsrs _final");
        this.state = update(this.state, Action.SHUTDOWN);
        callback();
    }
}
module.exports = GoogleSpeechRecogStream;
