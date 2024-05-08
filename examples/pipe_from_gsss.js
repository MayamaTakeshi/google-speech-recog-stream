const fs = require('fs')
const wav = require('wav')
const Speaker = require('speaker')
const au = require('@mayama/audio-utils')

const GSSS = require('google-speech-synth-stream')
const GSRS = require('../index.js')

const language = 'en-US'

const audioFormat = 1 // LINEAR16

const signed = true

const format = {
  audioFormat,
  channels: 1,
  sampleRate: 16000,
  signed,
}

const config = {
	work_dir: './tmp',
}

if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp')
}

const params = {
  // We must add a break to see google performing continuous recognition
	text: '<speak>hello world<break time="3s"/>how are you?<break time="3s"/></speak>',
  language,
	voice: 'en-US-Standard-G',
}

const opts = {
  format,
  params,
  config,
}

const ss = new GSSS(opts)

const sr = new GSRS({
  format,
  params: {
    language,
  }
})

const speaker = new Speaker(format)

// We need to write some initial silence to the speaker to avoid scratchyness/gaps
const size = 320 * 64
console.log("writing initial silence to speaker", size)
data = au.gen_silence(audioFormat, signed, size)
speaker.write(data)

sr.on('speech', data => {
  console.log('speech', JSON.stringify(data, null, 2))
})

ss.pipe(sr)
ss.pipe(speaker)
