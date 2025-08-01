import { useState, useCallback } from 'react'
import TextEditor from './components/TextEditor'
import Terminal from './components/Terminal'
import GitTreeVisualization from './components/GitTreeVisualization'
import { GitContextProvider } from './context/GitContext'

function App() {
  const [activeLeftPanel, setActiveLeftPanel] = useState('editor') // 'editor' or 'terminal'

  return (
    <GitContextProvider>
      <div className="h-screen bg-gray-900 text-white flex">
        {/* Left Panel - Editor and Terminal */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
          {/* Tab Navigation */}
          <div className="flex bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => setActiveLeftPanel('editor')}
              className={`px-4 py-2 text-sm font-medium ${
                activeLeftPanel === 'editor'
                  ? 'bg-gray-700 text-white border-b-2 border-git-blue'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📝 Editor
            </button>
            <button
              onClick={() => setActiveLeftPanel('terminal')}
              className={`px-4 py-2 text-sm font-medium ${
                activeLeftPanel === 'terminal'
                  ? 'bg-gray-700 text-white border-b-2 border-git-blue'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💻 Terminal
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {activeLeftPanel === 'editor' && <TextEditor />}
            {activeLeftPanel === 'terminal' && <Terminal />}
          </div>
        </div>

        {/* Right Panel - Git Tree Visualization */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
            <h2 className="text-sm font-medium text-white">🌳 Git Tree Visualization</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <GitTreeVisualization />
          </div>
        </div>
      </div>
    </GitContextProvider>
  )
}

export default App 