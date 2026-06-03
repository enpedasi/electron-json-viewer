import React from 'react'
import './TabsComponent.css'
import { getFileNameFromPath } from '../Cell/FileUtils'

interface TabInfo {
  id: string
  fileName: string
  filePath: string | null
  isDirty?: boolean
}

interface TabsProps {
  tabs: TabInfo[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onAddTab: () => void
  onToggleEditMode?: () => void
  onToggleViewMode?: () => void
  activeTabMode?: string
  activeTabViewMode?: string
}

const TabsComponent: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleEditMode,
  onToggleViewMode,
  activeTabMode = 'view',
  activeTabViewMode = 'grid'
}) => {
  const isEditMode = activeTabMode === 'edit'
  const getTabDisplayName = (tab: TabInfo) =>
    tab.filePath ? getFileNameFromPath(tab.filePath) : getFileNameFromPath(tab.fileName)

  return (
    <div className="tabs-container">
      <ul className="tabs-list">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            title={tab.filePath || 'Untitled'}
          >
            <span className="tab-name">
              {tab.isDirty && <span className="dirty-marker">*</span>}
              {getTabDisplayName(tab)}
            </span>
            {(tabs.length > 1 || tab.filePath !== null) && (
              <button
                className="close-tab-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                aria-label={`Close tab ${getTabDisplayName(tab)}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
        <li className="add-tab-item" onClick={onAddTab} title="New Tab">
          <button className="add-tab-btn">+</button>
        </li>
      </ul>
      <div className="tab-mode-buttons">
        <button
          className={`tab-mode-btn ${isEditMode ? 'active' : ''}`}
          onClick={onToggleEditMode}
          title={isEditMode ? '閲覧モードに切替' : '編集モードに切替'}
        >
          {isEditMode ? '✏️ 編集' : '👁 閲覧'}
        </button>
        <button
          className={`tab-mode-btn ${activeTabViewMode === 'text' ? 'active' : ''}`}
          onClick={onToggleViewMode}
          title={activeTabViewMode === 'grid' ? 'テキスト表示' : 'グリッド表示'}
        >
          {activeTabViewMode === 'grid' ? '{ } テキスト' : '⚏ グリッド'}
        </button>
      </div>
    </div>
  )
}

export default TabsComponent
