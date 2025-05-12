// src/renderer/src/components/Tabs/TabsComponent.tsx
// 新規作成
import React from 'react';
import './TabsComponent.css'; // スタイルファイル

// App.tsx からインポートするか、共通の型定義ファイルを作成する
interface TabInfo {
  id: string;
  fileName: string; // 表示名
  filePath: string | null;
}

interface TabsProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: () => void; // "+"ボタン用
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
            title={tab.filePath || 'Untitled'} // フルパスをツールチップに表示
          >
            <span className="tab-name">{tab.fileName}</span>
            {/* 最後のタブ以外、またはタブが複数の場合に閉じるボタンを表示 */}
            {(tabs.length > 1 || tab.filePath !== null) && (
                 <button
                    className="close-tab-btn"
                    onClick={(e) => {
                        e.stopPropagation(); // 親liのonClickイベントを発火させない
                        onCloseTab(tab.id);
                    }}
                    aria-label={`Close tab ${tab.fileName}`}
                 >
                 ×
                 </button>
            )}
          </li>
        ))}
         {/* タブ追加ボタン */}
         <li className="add-tab-item" onClick={onAddTab} title="New Tab">
            <button className="add-tab-btn">+</button>
         </li>
      </ul>
    </div>
  );
};

export default TabsComponent;
