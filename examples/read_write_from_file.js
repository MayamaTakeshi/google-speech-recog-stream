const fs = require('fs')
const wav = require('wav')
const Speaker = require('speaker')
const au = require('@mayama/audio-utils')

const GSRS = require('../index.js')

const usage = () => {
  console.log(`
Arguments: language wav_file_path
Ex:        en-US examples/artifacts/how_are_you.16000hz.end_pad10.wav

Obs: the wav file must have silence at the end to trigger google VAD timeout.
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

  const speaker = new Speaker(format)

  // We need to write some initial silence to the speaker to avoid scratchyness/gaps
  const size = 320 * 64
  console.log("writing initial silence to speaker", size)
  data = au.gen_silence(1, true, size)
  speaker.write(data)

  sr.on('speech', data => {
    console.log('speech', JSON.stringify(data, null, 2))
    process.exit(0)
  })

  const intId = setInterval(() => {
    const size = format.sampleRate / 8000 * 320
    const data = reader.read(size)
    //console.log('data', data)
    if(data) {
      sr.write(data)
      speaker.write(data)
    } else {
      console.log("no more data")
      clearInterval(intId)
    }
  }, 20)
})

file.pipe(reader)

