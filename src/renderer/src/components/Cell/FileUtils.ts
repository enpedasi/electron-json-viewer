import yaml from 'js-yaml'

export type FileType = 'json' | 'yaml'

function preprocessYaml(text: string): string {
  return text.replace(/(?<![!"'])![a-zA-Z][a-zA-Z0-9_:/-]*/g, '')
}

export function detectFileType(filePath: string | null): FileType {
  if (!filePath) return 'json'
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'yaml' || ext === 'yml') return 'yaml'
  return 'json'
}

export function parseContent(rawText: string, fileType: FileType): any {
  if (fileType === 'yaml') return yaml.load(preprocessYaml(rawText))
  return JSON.parse(rawText)
}

export function serializeData(data: any, fileType: FileType): string {
  if (fileType === 'yaml') return yaml.dump(data, { indent: 2, lineWidth: -1 })
  return JSON.stringify(data, null, 2)
}

export function validateText(text: string, fileType: FileType): any {
  if (fileType === 'yaml') return yaml.load(preprocessYaml(text))
  return JSON.parse(text)
}

export function defaultFileName(fileType: FileType): string {
  return fileType === 'yaml' ? 'untitled.yaml' : 'untitled.json'
}
