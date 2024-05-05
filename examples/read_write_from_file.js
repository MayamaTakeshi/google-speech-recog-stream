const fs = require('fs')
const wav = require('wav')

const GSRS = require('../index.js')

const usage = () => {
  console.log(`
Arguments: language file_path
Ex:        en-US hello_world.wav
`)
}

if(process.argv.length != 4) {
  usage()
  process.exit(1)
}

language = process.argv[2]
file_path = process.argv[3]

const file = fs.createReadStream(file_path)
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
    process.exit(0)
  })

  const intId = setInterval(() => {
    const size = format.sampleRate / 8000 * 320
    const data = reader.read(size)
    //console.log('data', data)
    if(data) {
      sr.write(data)
    } else {
      console.log("no more data")
      clearInterval(intId)
    }
  }, 20)
})

file.pipe(reader)

