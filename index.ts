const speech = require("@google-cloud/speech");

const speechClient = new speech.SpeechClient();

const { Writable } = require("stream");

const events = require("events");

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
  //request?: Record<string, any>,
}

type Config = Record<string, unknown>

type Opts = {
  uuid?: string,
  format: Format,
  params: Params,
  config: Config,
}

type State = {
  uuid: string,
  format: Format,
  params: Params,
  config: Config,
  recognizeStream: any | null,
  eventEmitter: any,
}

enum Action {
  START_RECOG,
  SHUTDOWN,
}

type EventCallback = (...args: any[]) => void

const add_evt_listeners = (evtEmitter: any, listeners: Array<[string, EventCallback]>) => {
  evtEmitter.my_listeners = evtEmitter.my_listeners ?? []

  listeners.forEach(([evt_name, evt_cb]) => {
    evtEmitter.on(evt_name, evt_cb)
    evtEmitter.my_listeners.push([evt_name, evt_cb]) 
  })
}

const remove_evt_listeners = (evtEmitter: any) => {
  evtEmitter.my_listeners.forEach((listener: [string, EventCallback]) => {
    const [evt_name, evt_cb] = listener
    evtEmitter.removeEventListener(evt_name, evt_cb)
  })

  evtEmitter.my_listeners = []
}

const update = (state: State, action: Action) : State => {
  switch(action) {
  case Action.START_RECOG: {
    var request: any = state.params.request

    if(!request) {
      request = {
        single_utterance: true,
      }
    }

    if(!request.config) {
      request.config = {}
    }

    if(!request.config.encoding) {
      const audioEncoding = audioFormat2audioEncoding(state.format.audioFormat)
      if(!audioEncoding) {
        setTimeout(() => {
          state.eventEmitter.emit('error', 'unsupported_audio_format')
        }, 0)
        return state
      }
      request.config.encoding = audioEncoding
    }

    if(!request.config.sampleRateHertz) {
      request.config.sampleRateHertz = state.format.sampleRate
    }

    if(!request.config.langugeCode) {
      request.config.languageCode = state.params.language
    }

    console.log("gsrs request", request)

    const on_error = (error: string) => {
      var err_msg = `recognizeStream error: ${error}`;
      state.eventEmitter.emit("error", err_msg);
    }

    const on_data = (data: any) => {
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

      state.eventEmitter.emit('speech', {
        transcript: transcript,
        confidence: confidence,
        full_details: data,
      });
    }

    const on_close = () => {
      var err_msg = `recognizeStream closed`;
      state.eventEmitter.emit("error", err_msg);
    }

    const recognizeStream = speechClient
      .streamingRecognize(request)

    add_evt_listeners(recognizeStream,[
      ["error", on_error],
      ["data", on_data],
      ["close", on_close]
    ])

    setTimeout(() => {
      state.eventEmitter.emit("ready");
    }, 0);

    return {
      ...state,
      recognizeStream,
    }
  }
  case Action.SHUTDOWN: {
    if (state.recognizeStream) {
      state.recognizeStream.end();
    }
    return {
      ...state,
      recognizeStream: null
    }
  }
  }
}

class GoogleSpeechRecogStream extends Writable {
  eventEmitter: any
  state: State

  constructor(opts: Opts) {
    super();

    this.state = {
      uuid: opts.uuid ? opts.uuid : uuid.v4(),
      format: opts.format,
      params: opts.params,
      config: opts.config,
      eventEmitter: new events.EventEmitter(),
      recognizeStream: null,
    }

    this.state = update(this.state, Action.START_RECOG)
  }

  on(evt: string, cb: EventCallback) {
    super.on(evt, cb);

    this.state.eventEmitter.on(evt, cb);
  }

  _write(data: Buffer, enc: number, callback: EventCallback) {
    if(this.state.recognizeStream) {
      var res = this.state.recognizeStream.write(data);
    }
    callback();
    return true;
  }

  _final(callback: EventCallback) {
    console.log("gsrs _final")
    this.state = update(this.state, Action.SHUTDOWN)
    callback();
  }
}

module.exports = GoogleSpeechRecogStream;
