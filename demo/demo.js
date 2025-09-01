import { parseSync, stringifySync } from '../dist/subtitle.esm.js'

const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const fileList = document.getElementById('file-list')
const outputList = document.getElementById('output-list')
const downloadAllBtn = document.getElementById('download-all')
const settingsBtn = document.getElementById('open-settings')
const settingsPane = document.getElementById('settings')
const closeSettings = document.getElementById('close-settings')

const fmtTxt = document.getElementById('fmt-txt')
const fmtSrt = document.getElementById('fmt-srt')
const fmtVtt = document.getElementById('fmt-vtt')
const fmtJson = document.getElementById('fmt-json')
const removeTags = document.getElementById('remove-tags')
const lineJoin = document.getElementById('line-join')

const outputs = []

settingsBtn.onclick = () => settingsPane.classList.remove('hidden')
closeSettings.onclick = () => settingsPane.classList.add('hidden')

const preventDefaults = e => {
  e.preventDefault()
  e.stopPropagation()
}

;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false)
})

;['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => dropZone.classList.add('drag'))
})

;['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag'))
})

dropZone.addEventListener('drop', e => {
  handleFiles(e.dataTransfer.files)
})

fileInput.addEventListener('change', e => {
  handleFiles(e.target.files)
})

function handleFiles(files) {
  ;[...files].forEach(file => {
    const reader = new FileReader()
    reader.onload = () => processFile(file, reader.result)
    reader.readAsText(file)
  })
}

function processFile(file, text) {
  let nodes
  try {
    nodes = parseSync(text)
  } catch (err) {
    const li = document.createElement('li')
    li.textContent = `${file.name} - error parsing`
    fileList.appendChild(li)
    return
  }

  const cueCount = nodes.filter(n => n.type === 'cue').length
  const li = document.createElement('li')
  const preview = document.createElement('details')
  preview.innerHTML = '<summary>' + file.name + ` (${cueCount} cues)</summary>`
  const previewList = document.createElement('ol')
  nodes.filter(n => n.type === 'cue').slice(0, 3).forEach(c => {
    const item = document.createElement('li')
    item.textContent = c.data.text.replace(/\n/g, ' ')
    previewList.appendChild(item)
  })
  preview.appendChild(previewList)
  li.appendChild(preview)
  fileList.appendChild(li)

  const processed = removeTags.checked
    ? nodes.map(n =>
        n.type === 'cue'
          ? { ...n, data: { ...n.data, text: n.data.text.replace(/<[^>]+>/g, '') } }
          : n
      )
    : nodes

  const baseName = file.name.replace(/\.[^.]+$/, '')

  const selectedOutputs = []

  if (fmtTxt.checked) {
    const txt = buildDialogue(processed)
    const name = `${baseName}.dialogue.txt`
    selectedOutputs.push({ name, content: txt })
  }

  if (fmtSrt.checked) {
    const srt = stringifySync(processed)
    const name = `${baseName}.clean.srt`
    selectedOutputs.push({ name, content: srt })
  }

  if (fmtVtt.checked) {
    const vtt = stringifySync(processed, { format: 'WebVTT' })
    const name = `${baseName}.vtt`
    selectedOutputs.push({ name, content: vtt })
  }

  if (fmtJson.checked) {
    const json = JSON.stringify(processed, null, 2)
    const name = `${baseName}.json`
    selectedOutputs.push({ name, content: json })
  }

  selectedOutputs.forEach(out => {
    outputs.push(out)
    const li = document.createElement('li')
    const a = createDownloadLink(out.content, out.name)
    li.appendChild(a)
    outputList.appendChild(li)
  })

  downloadAllBtn.disabled = outputs.length === 0
}

function buildDialogue(nodes) {
  const join = lineJoin.value
  const cues = nodes.filter(n => n.type === 'cue')
  return cues
    .map(c => {
      let text = c.data.text
      if (join === 'cue') text = text.replace(/\n/g, ' ')
      return text
    })
    .join(join === 'all' ? ' ' : '\n')
}

function createDownloadLink(content, name) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.textContent = `Download ${name}`
  return a
}

downloadAllBtn.addEventListener('click', () => {
  const zip = new JSZip()
  outputs.forEach(out => zip.file(out.name, out.content))
  zip.generateAsync({ type: 'blob' }).then(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'subtitles.zip'
    a.click()
    URL.revokeObjectURL(url)
  })
})
