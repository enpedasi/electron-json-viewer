import yaml from 'js-yaml'

export type FileType = 'json' | 'yaml'

const tolerantSchema = yaml.DEFAULT_SCHEMA.extend({
  explicit: [
    new yaml.Type('!', {
      kind: 'scalar',
      multi: true,
      resolve: () => true,
      construct: (data) => data ?? ''
    }),
    new yaml.Type('!', {
      kind: 'mapping',
      multi: true,
      resolve: () => true,
      construct: (data) => data ?? {}
    }),
    new yaml.Type('!', {
      kind: 'sequence',
      multi: true,
      resolve: () => true,
      construct: (data) => data ?? []
    })
  ]
})

export function detectFileType(filePath: string | null): FileType {
  if (!filePath) return 'json'
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'yaml' || ext === 'yml') return 'yaml'
  return 'json'
}

export function parseContent(rawText: string, fileType: FileType): any {
  if (fileType === 'yaml') return yaml.load(rawText, { schema: tolerantSchema })
  return JSON.parse(rawText)
}

export function serializeData(data: any, fileType: FileType): string {
  if (fileType === 'yaml')
    return yaml.dump(data, { indent: 2, lineWidth: -1, schema: tolerantSchema })
  return JSON.stringify(data, null, 2)
}

export function validateText(text: string, fileType: FileType): any {
  if (fileType === 'yaml') return yaml.load(text, { schema: tolerantSchema })
  return JSON.parse(text)
}

export function defaultFileName(fileType: FileType): string {
  return fileType === 'yaml' ? 'untitled.yaml' : 'untitled.json'
}

export function getFileNameFromPath(filePath: string | null): string {
  if (!filePath) return 'Untitled'
  const normalizedPath = filePath.replace(/\\/g, '/')
  return normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1) || 'Untitled'
}
