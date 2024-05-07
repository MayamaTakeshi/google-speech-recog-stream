const speech = require("@google-cloud/speech");

const speechClient = new speech.SpeechClient();

const { Writable } = require("stream");

const { EventEmitter } = require("events");

const _ = require("lodash");

const uuid = require('uuid');

const audioFormat2audioEncoding = (af: number) => {
  if(af == 1) {
    return "LINEAR16"
  } else if(af == 7) {
    return "MULAW"
  } 
  return ""
}

type Format = {
  audioFormat: number,
  sampleRate: number,
  channels: number,
  bitDepth: number,
}

type Params = {
  language: string,
  request?: Record<string, unknown>,
}

type Config = Record<string, unknown>

type Opts = {
  uuid?: string,
  format: Format,
  params: Params,
  config: Config,
}

type EvtCb = (evt: any) => void

type Cb = () => void

class GoogleSpeechRecogStream extends Writable {
  uuid: string;
  format: Format;
  params: Params;
  config: Config;

  //constructor(uuid, language, context, config) {

  // opts: {uuid, format, params: {language, request}, config)
  constructor(opts: Opts) {

    super();

    this.uuid = opts.uuid ? opts.uuid : uuid.v4()

    this.eventEmitter = new EventEmitter()

    this.format = opts.format
    this.params = opts.params
    this.config = opts.config

    this.setup_speechrecog()

    this.start_of_input = false;
  }

  setup_speechrecog() {
    var request: any

    if(!request) {
      request = {
        single_utterance: true,
      }
    }

    if(!request.config) {
      request.config = {}
    }

    if(!request.config.encoding) {
      const audioEncoding = audioFormat2audioEncoding(this.format.audioFormat)
      if(!audioEncoding) {
        setTimeout(() => {
          this.eventEmitter.emit('error', 'unsupported_audio_format')
        }, 0)
        return
      }
      request.config.encoding = audioEncoding
    }

    if(!request.config.sampleRateHertz) {
      request.config.sampleRateHertz = this.format.sampleRate
    }

    if(!request.config.langugeCode) {
      request.config.languageCode = this.params.language
    }

    console.log("gsrs request", request)

    this.recognizeStream = speechClient
      .streamingRecognize(request)
      .on("error", (error: string) => {
        var err_msg = `recognizeStream error: ${error}`;
        this.eventEmitter.emit("error", err_msg);
      })
      .on("data", (data: any) => {
        var transcript =
          data.results && data.results[0]
            ? data.results[0].alternatives[0].transcript
            : "";
        var confidence =
          data.results && data.results[0]
            ? data.results[0].alternatives[0].confidence
            : 0;

        if (!data.results) return;

        if (!data.results[0]) return;

        this.eventEmitter.emit('speech', {
          transcript: transcript,
          confidence: confidence,
          full_details: data,
        });
      })
      .on("close", () => {
        var err_msg = `recognizeStream closed`;
        this.eventEmitter.emit("error", err_msg);
      });

    setTimeout(() => {
      this.eventEmitter.emit("ready");
    }, 0);
  }

  on(evt: string, cb: EvtCb) {
    super.on(evt, cb);

    this.eventEmitter.on(evt, cb);
  }

  _write(data: Buffer, enc: number, callback: Cb) {
    var res = this.recognizeStream.write(data);
    callback();
    return true;
  }

  _final(callback: Cb) {
    console.log("gsrs _final")
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }

    callback();
  }
}

module.exports = GoogleSpeechRecogStream;
