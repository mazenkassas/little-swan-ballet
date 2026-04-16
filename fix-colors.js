const fs = require('fs')
const path = require('path')

const replacements = [
  ['var(--pk-light)', '#F5E6EA'],
  ['var(--pk-dark)', '#8B4A58'],
  ['var(--pk-mid)', '#E8B4C0'],
  ['var(--pk)', '#C8788A'],
  ['var(--bg2)', '#F7F0F0'],
  ['var(--bg3)', '#EEE4E6'],
  ['var(--bg)', '#FDFAF8'],
  ['var(--txt3)', '#B89CA0'],
  ['var(--txt2)', '#7A5C63'],
  ['var(--txt)', '#2C1F24'],
  ['var(--card)', '#FFFFFF'],
  ['var(--border)', '#EDD8DC'],
  ['var(--green-bg)', '#E8F5EE'],
  ['var(--green)', '#4A8C6A'],
  ['var(--amber-bg)', '#FBF0E0'],
  ['var(--amber)', '#9C7440'],
  ['var(--blue-bg)', '#E8F0FA'],
  ['var(--blue)', '#4A6E9C'],
]

function processDir(dir) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory() && !['node_modules', '.next', '.git'].includes(file)) {
      processDir(fullPath)
    } else if (file.match(/\.(tsx|ts|css)$/)) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let changed = false
      replacements.forEach(([from, to]) => {
        if (content.includes(from)) {
          content = content.split(from).join(to)
          changed = true
        }
      })
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8')
        console.log('Fixed: ' + fullPath)
      }
    }
  })
}

processDir('./src')
console.log('Done!')
