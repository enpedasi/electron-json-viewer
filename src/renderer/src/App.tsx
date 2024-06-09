import { useState, useEffect } from 'react'
import JsonGrid from '@redheadphone/react-json-grid'

function App() {
  const [jsonData, setJsonData] = useState(null)

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const filePath = e.dataTransfer.files[0].path
    const fileContent = await window.electron.readFile(filePath)
    const json = JSON.parse(fileContent)
    setJsonData(json)
  }

  return (
    <div
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
      onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        {jsonData ? (
          <div style={{ width: '100%', height: '90%', overflow: 'auto' }}>
            <JsonGrid data={jsonData} />
          </div>
        ) : (
          <p>JSONファイルをドラッグ&ドロップしてください</p>
        )}
    </div>
  )
}

export default App
