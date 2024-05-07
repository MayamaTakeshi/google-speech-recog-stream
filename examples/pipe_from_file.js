const fs = require('fs')
const wav = require('wav')
const Speaker = require('speaker')

const GSRS = require('../index.js')

const usage = () => {
  console.log(`
Arguments: language wav_file_path
Ex:        en-US examples/artifacts/how_are_you.16000hz.end_pad10.wav

Obs:  the wav file must contain some silence at the end for the google VAD timeout to be triggered.
`)
}

if(process.argv.length != 4) {
  usage()
  process.exit(1)
}

language = process.argv[2]
wav_file_path = process.argv[3]

const file = fs.createReadStream(wav_file_path)
const reader = new wav.Reader()

reader.on('format', function (format) {
  console.log("format", format)
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

  reader.pipe(sr)
  reader.pipe(speaker)
})

file.pipe(reader)

