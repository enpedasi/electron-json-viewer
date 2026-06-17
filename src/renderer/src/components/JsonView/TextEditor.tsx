import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TabState } from '../../App'
import { serializeData, validateText } from '../Cell/FileUtils'
import { Translator } from '../../i18n'

interface TextEditorProps {
  tabData: TabState
  onChange: (newText: string) => void
  t: Translator
}

const LINE_HEIGHT_PX = 19.5
const LINE_NUMBER_BUFFER = 20
const FALLBACK_VIEWPORT_HEIGHT = 600

interface EditorState {
  text: string
  lineCount: number
}

function countLines(text: string): number {
  let count = 1
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) count += 1
  }
  return count
}

function getInitialText(tabData: TabState): string {
  if (tabData.jsonData === null || tabData.jsonData === undefined) return ''
  if (!tabData.isDirty && tabData.originalContent !== '') return tabData.originalContent
  return serializeData(tabData.jsonData, tabData.fileType)
}

function createEditorState(tabData: TabState): EditorState {
  const text = getInitialText(tabData)
  return { text, lineCount: countLines(text) }
}

const TextEditor: React.FC<TextEditorProps> = ({ tabData, onChange, t }) => {
  const [editorState, setEditorState] = useState<EditorState>(() => createEditorState(tabData))
  const [error, setError] = useState<string | null>(null)
  const [lineNumberViewport, setLineNumberViewport] = useState({ scrollTop: 0, height: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumberFrameRef = useRef<number | null>(null)
  const { text, lineCount } = editorState

  const updateLineNumberViewport = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const next = {
      scrollTop: textarea.scrollTop,
      height: textarea.clientHeight
    }
    setLineNumberViewport((prev) =>
      prev.scrollTop === next.scrollTop && prev.height === next.height ? prev : next
    )
  }, [])

  const scheduleLineNumberViewportUpdate = useCallback(() => {
    if (lineNumberFrameRef.current !== null) return
    lineNumberFrameRef.current = window.requestAnimationFrame(() => {
      lineNumberFrameRef.current = null
      updateLineNumberViewport()
    })
  }, [updateLineNumberViewport])

  useEffect(() => {
    updateLineNumberViewport()
    const textarea = textareaRef.current
    const resizeObserver =
      textarea && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateLineNumberViewport)
        : null

    if (textarea && resizeObserver) {
      resizeObserver.observe(textarea)
    }

    return () => {
      resizeObserver?.disconnect()
      if (lineNumberFrameRef.current !== null) {
        window.cancelAnimationFrame(lineNumberFrameRef.current)
        lineNumberFrameRef.current = null
      }
    }
  }, [updateLineNumberViewport])

  const visibleLineNumbers = useMemo(() => {
    const viewportHeight = lineNumberViewport.height || FALLBACK_VIEWPORT_HEIGHT
    const firstVisibleLine =
      Math.floor(lineNumberViewport.scrollTop / LINE_HEIGHT_PX) + 1
    const visibleLineCount = Math.ceil(viewportHeight / LINE_HEIGHT_PX)
    const startLine = Math.max(1, firstVisibleLine - LINE_NUMBER_BUFFER)
    const endLine = Math.min(
      lineCount,
      firstVisibleLine + visibleLineCount + LINE_NUMBER_BUFFER
    )
    const numbers: number[] = []
    for (let line = startLine; line <= endLine; line += 1) {
      numbers.push(line)
    }

    return {
      numbers,
      offsetTop: (startLine - 1) * LINE_HEIGHT_PX - lineNumberViewport.scrollTop
    }
  }, [lineCount, lineNumberViewport])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value
      setEditorState({ text: newText, lineCount: countLines(newText) })
      try {
        validateText(newText, tabData.fileType)
        setError(null)
        onChange(newText)
      } catch (err: any) {
        setError(err.message)
      }
    },
    [onChange, tabData.fileType]
  )

  const handleScroll = useCallback(() => {
    scheduleLineNumberViewportUpdate()
  }, [scheduleLineNumberViewportUpdate])

  const handleFormat = useCallback(() => {
    try {
      const parsed = validateText(text, tabData.fileType)
      const formatted = serializeData(parsed, tabData.fileType)
      setEditorState({ text: formatted, lineCount: countLines(formatted) })
      setError(null)
      onChange(formatted)
    } catch (err: any) {
      setError(err.message)
    }
  }, [text, onChange, tabData.fileType])

  const handleMinify = useCallback(() => {
    try {
      const parsed = validateText(text, tabData.fileType)
      const minified = JSON.stringify(parsed)
      setEditorState({ text: minified, lineCount: 1 })
      setError(null)
      onChange(minified)
    } catch (err: any) {
      setError(err.message)
    }
  }, [text, onChange, tabData.fileType])

  const label = tabData.fileType === 'yaml' ? 'YAML' : 'JSON'

  return (
    <div className="text-editor-container">
      <div className="text-editor-toolbar">
        <button className="text-editor-btn" onClick={handleFormat}>
          {t('text.format')}
        </button>
        {tabData.fileType === 'json' && (
          <button className="text-editor-btn" onClick={handleMinify}>
            {t('text.minify')}
          </button>
        )}
      </div>
      <div className="text-editor-body">
        <div className="line-numbers">
          <div
            className="line-number-list"
            style={{ transform: `translateY(${visibleLineNumbers.offsetTop}px)` }}
          >
            {visibleLineNumbers.numbers.map((line) => (
              <div key={line} className="line-number">
                {line}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="text-editor-textarea"
          value={text}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
          wrap="off"
        />
      </div>
      {error && (
        <div className="text-editor-error">
          <span>
            {t('text.parseError', { type: label, message: error })}
          </span>
        </div>
      )}
    </div>
  )
}

export default React.memo(TextEditor)
