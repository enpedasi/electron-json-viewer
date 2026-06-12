import React from 'react'
import { RowFilterCondition, RowFilterOperator } from './rowFilter'
import { Translator } from '../../i18n'

interface RowFilterPopoverProps {
  columnLabel: string
  distinctValues: string[]
  distinctTruncated: boolean
  condition: RowFilterCondition | undefined
  onApply: (condition: RowFilterCondition) => void
  onClearColumn: () => void
  onClose: () => void
  t: Translator
}

const OPERATORS: Array<{ value: RowFilterOperator; label: string }> = [
  { value: 'contains', label: 'contains' },
  { value: 'eq', label: '=' },
  { value: 'ne', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' }
]

function getDistinctValueLabel(value: string, t: Translator): string {
  if (value === '') return t('table.rowFilterEmptyString')
  if (value.trim() === '') return t('table.rowFilterWhitespaceString', { count: value.length })
  return value
}

const RowFilterPopover: React.FC<RowFilterPopoverProps> = ({
  columnLabel,
  distinctValues,
  distinctTruncated,
  condition,
  onApply,
  onClearColumn,
  onClose,
  t
}) => {
  const [mode, setMode] = React.useState<'values' | 'expr'>(
    condition?.type === 'expr' ? 'expr' : 'values'
  )
  const [checked, setChecked] = React.useState<Set<string>>(
    () =>
      new Set(
        condition?.type === 'values' ? condition.selectedValues : distinctValues
      )
  )
  const [valueQuery, setValueQuery] = React.useState('')
  const [operator, setOperator] = React.useState<RowFilterOperator>(
    condition?.type === 'expr' ? condition.operator : 'contains'
  )
  const [operand, setOperand] = React.useState(
    condition?.type === 'expr' ? condition.operand : ''
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const filteredValues = React.useMemo(() => {
    const query = valueQuery.trim().toLowerCase()
    if (!query) return distinctValues
    return distinctValues.filter((value) => value.toLowerCase().includes(query))
  }, [distinctValues, valueQuery])

  const selectedVisibleValues = React.useMemo(
    () => filteredValues.filter((value) => checked.has(value)),
    [checked, filteredValues]
  )
  const canApply =
    mode === 'values' ? !distinctTruncated && selectedVisibleValues.length > 0 : operand.trim() !== ''

  return (
    <div className="key-filter-panel row-filter-panel">
      <div className="key-filter-panel-header">
        <span className="key-filter-title">
          {t('table.rowFilterTitle', { column: columnLabel })}
        </span>
      </div>
      <div className="row-filter-tabs">
        <button
          className={mode === 'values' ? 'active' : ''}
          onClick={() => setMode('values')}
        >
          {t('table.rowFilterValues')}
        </button>
        <button
          className={mode === 'expr' ? 'active' : ''}
          onClick={() => setMode('expr')}
        >
          {t('table.rowFilterCondition')}
        </button>
      </div>
      {mode === 'values' ? (
        <>
          <input
            className="key-filter-search"
            value={valueQuery}
            onChange={(event) => setValueQuery(event.target.value)}
            placeholder={t('table.rowFilterSearchValues')}
          />
          <div className="row-filter-bulk-actions">
            <button className="key-filter-inline-clear" onClick={() => setChecked(new Set(distinctValues))}>
              {t('table.rowFilterSelectAll')}
            </button>
            <button className="key-filter-inline-clear" onClick={() => setChecked(new Set())}>
              {t('table.rowFilterUnselectAll')}
            </button>
          </div>
          <div className="key-filter-options">
            {filteredValues.map((value) => {
              const isBlankValue = value.trim() === ''
              return (
                <label key={value} className="key-filter-option">
                  <input
                    type="checkbox"
                    checked={checked.has(value)}
                    onChange={(event) => {
                      const next = new Set(checked)
                      if (event.currentTarget.checked) next.add(value)
                      else next.delete(value)
                      setChecked(next)
                    }}
                  />
                  <span
                    className={isBlankValue ? 'row-filter-empty-value' : undefined}
                    title={isBlankValue ? getDistinctValueLabel(value, t) : value}
                  >
                    {getDistinctValueLabel(value, t)}
                  </span>
                </label>
              )
            })}
          </div>
          {distinctTruncated && (
            <div className="key-filter-badge">
              {t('table.rowFilterTruncated', { count: distinctValues.length })}
            </div>
          )}
        </>
      ) : (
        <div className="row-filter-condition-row">
          <select
            value={operator}
            onChange={(event) => setOperator(event.target.value as RowFilterOperator)}
          >
            {OPERATORS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value === 'contains' ? t('table.rowFilterContains') : item.label}
              </option>
            ))}
          </select>
          <input value={operand} onChange={(event) => setOperand(event.target.value)} />
        </div>
      )}
      <div className="key-filter-actions">
        <button
          className="key-filter-action primary"
          disabled={!canApply}
          onClick={() =>
            mode === 'values'
              ? valueQuery.trim() === '' && selectedVisibleValues.length === distinctValues.length
                ? onClearColumn()
                : onApply({ type: 'values', selectedValues: selectedVisibleValues })
              : onApply({ type: 'expr', operator, operand })
          }
        >
          {t('table.apply')}
        </button>
        <button className="key-filter-action" onClick={onClearColumn}>
          {t('table.clear')}
        </button>
        <button className="key-filter-action" onClick={onClose}>
          {t('table.cancel')}
        </button>
      </div>
    </div>
  )
}

export default RowFilterPopover
