import React, { useState, useRef, useEffect, useCallback } from 'react'
import { coerceValue } from './CellUtils'

interface EditableCellProps {
  value: any
  path: string
  onCommit: (path: string, newValue: any) => void
}

const LINE_HEIGHT = 20

const needsTextarea = (v: any, measuredHeight: number | undefined) => {
  if (typeof v === 'string' && v.includes('\n')) return true
  if (measuredHeight !== undefined && measuredHeight > LINE_HEIGHT * 1.2) return true
  return false
}

const EditableCell: React.FC<EditableCellProps> = ({ value, path, onCommit }) => {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const useTextarea = needsTextarea(value, measuredSize?.height)

  useEffect(() => {
    if (!editing) return
    if (useTextarea && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    } else if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing, useTextarea])

  const startEditing = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === 'keydown') {
      const ke = e as React.KeyboardEvent
      if (ke.key !== 'Enter' && ke.key !== 'F2') return
      if (ke.nativeEvent.isComposing) return
    }
    e.stopPropagation()

    if (measureRef.current) {
      const rect = measureRef.current.getBoundingClientRect()
      setMeasuredSize({ width: rect.width, height: rect.height })
    }

    setEditing(true)
    if (value === null) {
      setInputValue('null')
    } else if (typeof value === 'boolean') {
      setInputValue(String(value))
    } else {
      setInputValue(String(value))
    }
  }, [value])

  const commit = useCallback(() => {
    const originalType = value === null ? 'null' : typeof value
    const newValue = coerceValue(inputValue, originalType)
    if (newValue !== value) {
      onCommit(path, newValue)
    }
    setEditing(false)
    setMeasuredSize(null)
  }, [inputValue, value, path, onCommit])

  const cancel = useCallback(() => {
    setEditing(false)
    setMeasuredSize(null)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (useTextarea && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      commit()
    } else if (!useTextarea && e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }, [commit, cancel, useTextarea])

  const handleBlur = useCallback(() => {
    commit()
  }, [commit])

  if (typeof value === 'boolean') {
    return (
      <span
        className={`value boolean editable-cell editable-boolean`}
        data-path={path}
        onClick={(e) => {
          e.stopPropagation()
          onCommit(path, !value)
        }}
        title="クリックで切替"
      >
        {String(value)}
      </span>
    )
  }

  if (value === null) {
    if (!editing) {
      return (
        <span
          className={`value null editable-cell`}
          data-path={path}
          onDoubleClick={startEditing}
          onKeyDown={startEditing}
          tabIndex={0}
          title="ダブルクリックで編集"
        />
      )
    }
  }

  if (!editing) {
    return (
      <span
        ref={measureRef}
        className={`value ${typeof value} editable-cell`}
        data-path={path}
        onDoubleClick={startEditing}
        onKeyDown={startEditing}
        tabIndex={0}
        title="ダブルクリックで編集"
      >
        {String(value)}
      </span>
    )
  }

  if (useTextarea) {
    const style: React.CSSProperties = measuredSize
      ? { width: measuredSize.width, minHeight: measuredSize.height }
      : undefined
    return (
      <textarea
        ref={textareaRef}
        className="editable-textarea"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        rows={Math.min(inputValue.split('\n').length, 10)}
        style={style}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      className="editable-input"
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

export default React.memo(EditableCell)
