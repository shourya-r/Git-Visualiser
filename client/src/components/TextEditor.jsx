import { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Save, FileText, Plus, Check, AlertCircle, RefreshCw } from 'lucide-react'

function TextEditor() {
  const [files, setFiles] = useState([])
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [newFileName, setNewFileName] = useState('')
  const [showNewFileInput, setShowNewFileInput] = useState(false)
  const [fileSaveStates, setFileSaveStates] = useState({}) // Track save status
  const [diskFiles, setDiskFiles] = useState([]) // Files that exist on disk
  const editorRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)

  const activeFile = files[activeFileIndex]

  // Load existing files from disk when component mounts
  useEffect(() => {
    loadDiskFiles()
    // The server will create default .txt files if none exist
  }, [])

  // Auto-save functionality with debounce
  useEffect(() => {
    if (!activeFile) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (fileSaveStates[activeFile.name] === 'unsaved') {
        autoSaveFile(activeFile)
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [activeFile?.content, activeFile?.name])

  const loadDiskFiles = async () => {
    try {
      const response = await fetch('/api/list-files')
      if (response.ok) {
        const diskFileList = await response.json()
        setDiskFiles(diskFileList)
        
        // Load content of existing files
        for (const diskFile of diskFileList) {
          if (!files.find(f => f.name === diskFile.name)) {
            const contentResponse = await fetch(`/api/get-file?filename=${encodeURIComponent(diskFile.name)}`)
            if (contentResponse.ok) {
              const content = await contentResponse.text()
              setFiles(prev => [...prev, { 
                name: diskFile.name, 
                content,
                isNew: false 
              }])
              setFileSaveStates(prev => ({ ...prev, [diskFile.name]: 'saved' }))
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load disk files:', error)
    }
  }

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
  }

  const handleEditorChange = (value) => {
    const updatedFiles = [...files]
    updatedFiles[activeFileIndex] = {
      ...updatedFiles[activeFileIndex],
      content: value
    }
    setFiles(updatedFiles)
    
    // Mark file as unsaved
    setFileSaveStates(prev => ({
      ...prev,
      [activeFile.name]: 'unsaved'
    }))
  }

  const autoSaveFile = async (file) => {
    await saveFileToServer(file, true)
  }

  const saveFile = async () => {
    if (!activeFile) return
    await saveFileToServer(activeFile, false)
  }

  const saveFileToServer = async (file, isAutoSave = false) => {
    try {
      setFileSaveStates(prev => ({
        ...prev,
        [file.name]: 'saving'
      }))

      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          content: file.content
        })
      })
      
      if (response.ok) {
        setFileSaveStates(prev => ({
          ...prev,
          [file.name]: 'saved'
        }))
        
        // Update disk files list
        await loadDiskFiles()
        
        if (!isAutoSave) {
          console.log('File saved successfully')
        }

        // Mark file as no longer new
        setFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, isNew: false } : f
        ))
      } else {
        throw new Error('Failed to save file')
      }
    } catch (error) {
      setFileSaveStates(prev => ({
        ...prev,
        [file.name]: 'error'
      }))
      console.error('Failed to save file:', error)
    }
  }

  const createNewFile = () => {
    if (!newFileName.trim()) return
    
    const newFile = {
      name: newFileName,
      content: '',
      isNew: true
    }
    
    setFiles([...files, newFile])
    setActiveFileIndex(files.length)
    setFileSaveStates(prev => ({
      ...prev,
      [newFileName]: 'unsaved'
    }))
    setNewFileName('')
    setShowNewFileInput(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      createNewFile()
    } else if (e.key === 'Escape') {
      setShowNewFileInput(false)
      setNewFileName('')
    }
  }

  const getSaveIcon = (fileName) => {
    const state = fileSaveStates[fileName]
    switch (state) {
      case 'saving':
        return <RefreshCw size={12} className="text-yellow-400 animate-spin" />
      case 'saved':
        return <Check size={12} className="text-green-400" />
      case 'error':
        return <AlertCircle size={12} className="text-red-400" />
      default: // 'unsaved'
        return <div className="w-2 h-2 bg-yellow-400 rounded-full" />
    }
  }

  const isFileOnDisk = (fileName) => {
    return diskFiles.some(f => f.name === fileName)
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* File Tabs */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => setActiveFileIndex(index)}
            className={`flex items-center px-3 py-2 text-sm whitespace-nowrap border-r border-gray-700 ${
              index === activeFileIndex
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <FileText size={14} className="mr-1" />
            <span className={!isFileOnDisk(file.name) ? 'italic text-gray-500' : ''}>
              {file.name}
            </span>
            <div className="ml-2">
              {getSaveIcon(file.name)}
            </div>
          </button>
        ))}
        
        {/* New File Button */}
        {showNewFileInput ? (
          <div className="flex items-center px-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="filename..."
              className="bg-gray-700 text-white text-sm px-2 py-1 rounded border-none outline-none"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setShowNewFileInput(true)}
            className="flex items-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700"
            title="New File"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Editor Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            {activeFile ? activeFile.name : 'No file selected'}
          </span>
          {activeFile && (
            <div className="flex items-center space-x-2 text-xs">
              <div className={`flex items-center space-x-1 ${
                isFileOnDisk(activeFile.name) ? 'text-green-400' : 'text-gray-500'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isFileOnDisk(activeFile.name) ? 'bg-green-400' : 'bg-gray-500'
                }`} />
                <span>{isFileOnDisk(activeFile.name) ? 'On disk' : 'Memory only'}</span>
              </div>
              <span className="text-gray-600">•</span>
              <span className={`${
                fileSaveStates[activeFile.name] === 'saved' ? 'text-green-400' : 
                fileSaveStates[activeFile.name] === 'saving' ? 'text-yellow-400' :
                fileSaveStates[activeFile.name] === 'error' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {fileSaveStates[activeFile.name] === 'saved' ? 'Auto-saved' :
                 fileSaveStates[activeFile.name] === 'saving' ? 'Saving...' :
                 fileSaveStates[activeFile.name] === 'error' ? 'Save failed' : 'Auto-save in 2s'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadDiskFiles}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
            title="Refresh file list"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
          <button
            onClick={saveFile}
            className="flex items-center space-x-1 px-3 py-1 bg-git-blue hover:bg-blue-600 text-white text-sm rounded transition-colors"
            disabled={fileSaveStates[activeFile?.name] === 'saving'}
          >
            <Save size={14} />
            <span>Save Now</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          value={activeFile?.content || ''}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
          }}
        />
      </div>
    </div>
  )
}

export default TextEditor 