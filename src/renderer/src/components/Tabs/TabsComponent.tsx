import React from 'react'
import './TabsComponent.css'
import { getFileNameFromPath } from '../Cell/FileUtils'
import { Language, Translator } from '../../i18n'

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
  onSave?: () => void
  activeTabMode?: string
  activeTabViewMode?: string
  language: Language
  onLanguageChange: (language: Language) => void
  t: Translator
}

const TabsComponent: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleEditMode,
  onToggleViewMode,
  onSave,
  activeTabMode = 'view',
  activeTabViewMode = 'grid',
  language,
  onLanguageChange,
  t
}) => {
  const isEditMode = activeTabMode === 'edit'
  const getTabDisplayName = (tab: TabInfo) =>
    tab.filePath
      ? getFileNameFromPath(tab.filePath)
      : tab.fileName === 'Untitled'
        ? t('tabs.untitled')
        : getFileNameFromPath(tab.fileName)

  return (
    <div className="tabs-container">
      <ul className="tabs-list">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            title={tab.filePath || t('tabs.untitled')}
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
                aria-label={t('tabs.closeTab', { name: getTabDisplayName(tab) })}
              >
                ×
              </button>
            )}
          </li>
        ))}
        <li className="add-tab-item" onClick={onAddTab} title={t('tabs.newTab')}>
          <button className="add-tab-btn">+</button>
        </li>
      </ul>
      <div className="tab-mode-buttons">
        <button
          className="tab-mode-btn save-btn"
          onClick={onSave}
          title={t('tabs.save')}
        >
          💾 {t('tabs.save')}
        </button>
        <button
          className={`tab-mode-btn ${isEditMode ? 'active' : ''}`}
          onClick={onToggleEditMode}
          title={isEditMode ? t('tabs.switchToView') : t('tabs.switchToEdit')}
        >
          {isEditMode ? `✏️ ${t('tabs.edit')}` : `👁 ${t('tabs.view')}`}
        </button>
        <button
          className={`tab-mode-btn ${activeTabViewMode === 'text' ? 'active' : ''}`}
          onClick={onToggleViewMode}
          title={activeTabViewMode === 'grid' ? t('tabs.showText') : t('tabs.showGrid')}
        >
          {activeTabViewMode === 'grid' ? `{ } ${t('tabs.text')}` : `⚏ ${t('tabs.grid')}`}
        </button>
        <div className="language-switcher" title={t('tabs.language')} aria-label={t('tabs.language')}>
          <button
            className={`tab-mode-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => onLanguageChange('en')}
            title={t('tabs.english')}
          >
            EN
          </button>
          <button
            className={`tab-mode-btn ${language === 'ja' ? 'active' : ''}`}
            onClick={() => onLanguageChange('ja')}
            title={t('tabs.japanese')}
          >
            日本語
          </button>
        </div>
      </div>
    </div>
  )
}

export default TabsComponent
