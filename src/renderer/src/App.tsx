import React, { useState } from 'react';
import Cell from './components/Cell/Cell';
import './App.css';

function App() {
  const [jsonData, setJsonData] = useState(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const fileContent = await file.text();
    const json = JSON.parse(fileContent);
    setJsonData(json);
  };

  return (
    <div
      className="vscode-dark"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        top: 0,
        left: 0,
        overflow: 'auto'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {jsonData ? (
        <div style={{ width: '100%', height: '95%', overflow: 'auto' }}>
          <Cell element={jsonData} isRoot={true}  />
        </div>
      ) : (
        <p>JSONファイルをドラッグ&ドロップしてください</p>
      )}
    </div>
  );
}

export default App;
