// src/renderer/src/components/Tabs/TabsComponent.tsx
import React from 'react';
import './TabsComponent.css';

interface TabInfo {
  id: string;
  fileName: string;
  filePath: string | null;
  isDirty?: boolean;
}

interface TabsProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: () => void;
}

const TabsComponent: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
}) => {
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
              {tab.fileName}
            </span>
            {(tabs.length > 1 || tab.filePath !== null) && (
              <button
                className="close-tab-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                aria-label={`Close tab ${tab.fileName}`}
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
    </div>
  );
};

export default TabsComponent;
