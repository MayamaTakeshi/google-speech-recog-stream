# google-speech-recog-stream
A node.js writable audio stream for google Speech-to-Text

## Installation
```
npm i google-speech-recog-stream
```

## Usage

Sample code can be seen [here](https://github.com/MayamaTakeshi/google-speech-recog-stream/tree/main/examples)

You need to set your GOOGLE_APPLICATION_CREDENTIALS before trying them:

```
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials/file
```

After that, try:
```
node examples/pipe_from_file.js
```
