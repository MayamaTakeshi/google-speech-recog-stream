const fs = require('fs')
const wav = require('wav')

const GSRS = require('../index.js')

const file = fs.createReadStream('./examples/artifacts/ohayou_gozaimasu.wav')
const reader = new wav.Reader()

reader.on('format', function (format) {
  console.log("format", format)
  const sr = new GSRS({
    format,
    params: {
      language: 'ja-JP',
    }
  })

  sr.on('speech', data => {
    console.log('speech', data)
  })

  reader.pipe(sr)
})

file.pipe(reader)

