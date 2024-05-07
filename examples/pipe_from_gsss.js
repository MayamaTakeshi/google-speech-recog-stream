const fs = require('fs')
const wav = require('wav')

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

const opts = {
  format,
  config,
}

const ss = new GSSS(opts)
ss.speak({
	body: 'hello world',
	headers: {
		'speech-language': language,
		'voice-name': 'en-US-Standard-G',
	},
})

ss.on('ready', () => {
  const sr = new GSRS({
    format,
    params: {
      language,
    }
  })

  sr.on('speech', data => {
    console.log('speech', data)
  })

  ss.pipe(sr)
})

