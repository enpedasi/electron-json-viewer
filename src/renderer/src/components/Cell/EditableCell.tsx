import React, { useState, useRef, useEffect, useCallback } from 'react'
import { coerceValue } from './CellUtils'

interface EditableCellProps {
  value: any
  path: string
  onCommit: (path: string, newValue: any) => void
}

const EditableCell: React.FC<EditableCellProps> = ({ value, path, onCommit }) => {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEditing = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === 'keydown') {
      const ke = e as React.KeyboardEvent
      if (ke.key !== 'Enter' && ke.key !== 'F2') return
      if (ke.nativeEvent.isComposing) return
    }
    e.stopPropagation()
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
  }, [inputValue, value, path, onCommit])

  const cancel = useCallback(() => {
    setEditing(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }, [commit, cancel])

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
