import React, { useState, useEffect, useRef, useCallback } from 'react'
import { TabState } from '../../App'

interface TextEditorProps {
  tabData: TabState
  onChange: (newText: string) => void
}

const TextEditor: React.FC<TextEditorProps> = ({ tabData, onChange }) => {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lineCount, setLineCount] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tabData.jsonData !== null && tabData.jsonData !== undefined) {
      const formatted = JSON.stringify(tabData.jsonData, null, 2)
      setText(formatted)
      setLineCount(formatted.split('\n').length)
      setError(null)
    }
  }, [tabData.id])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    setLineCount(newText.split('\n').length)
    try {
      JSON.parse(newText)
      setError(null)
      onChange(newText)
    } catch (err: any) {
      setError(err.message)
    }
  }, [onChange])

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(text)
      const formatted = JSON.stringify(parsed, null, 2)
      setText(formatted)
      setLineCount(formatted.split('\n').length)
      setError(null)
      onChange(formatted)
    } catch (err: any) {
      setError(err.message)
    }
  }, [text, onChange])

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(text)
      const minified = JSON.stringify(parsed)
      setText(minified)
      setLineCount(1)
      setError(null)
      onChange(minified)
    } catch (err: any) {
      setError(err.message)
    }
  }, [text, onChange])

  return (
    <div className="text-editor-container">
      <div className="text-editor-toolbar">
        <button className="text-editor-btn" onClick={handleFormat}>フォーマット</button>
        <button className="text-editor-btn" onClick={handleMinify}>最小化</button>
      </div>
      <div className="text-editor-body">
        <div className="line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="line-number">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="text-editor-textarea"
          value={text}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
        />
      </div>
      {error && (
        <div className="text-editor-error">
          <span>JSONパースエラー: {error}</span>
        </div>
      )}
    </div>
  )
}

export default React.memo(TextEditor)
