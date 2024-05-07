const fs = require('fs')
const wav = require('wav')

const GSRS = require('../index.js')

const usage = () => {
  console.log(`
Arguments: language wav_file_path
Ex:        en-US artifacts/how_are_you.16000hz.wav
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

  sr.on('speech', data => {
    console.log('speech', data)
  })

  reader.pipe(sr)
})

file.pipe(reader)

