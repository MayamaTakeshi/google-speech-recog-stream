const fs = require('fs')
const wav = require('wav')
const Speaker = require('speaker')

const GSSS = require('google-speech-synth-stream')
const GSRS = require('../index.js')

const language = 'en-US'

const format = {
  audioFormat: 1,
  endianness: 'LE',
  channels: 1,
  sampleRate: 16000,
  byteRate: 16000,
  blockAlign: 2,
  bitDepth: 16,
  signed: true
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

ss.on('ready', () => {
  const sr = new GSRS({
    format,
    params: {
      language,
    }
  })

  const speaker = new Speaker(format)

  sr.on('speech', data => {
    console.log('speech', JSON.stringify(data, null, 2))
  })

  ss.pipe(sr)
  ss.pipe(speaker)
})

