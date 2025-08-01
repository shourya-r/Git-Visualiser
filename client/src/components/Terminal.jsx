import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useGitContext } from '../context/GitContext'
import '@xterm/xterm/css/xterm.css'

function Terminal() {
  const terminalRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const currentCommandRef = useRef('')
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const { setLastCommand, updateGitState } = useGitContext()

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize xterm
    const xterm = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff30',
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Welcome message
    xterm.writeln('Git Visualizer Terminal')
    xterm.writeln('Type git commands to interact with your repository')
    xterm.writeln('')
    writePrompt()

    // Handle input
    xterm.onData((data) => {
      const char = data.charCodeAt(0)
      
      if (char === 13) { // Enter
        xterm.writeln('')
        const command = currentCommandRef.current.trim()
        if (command) {
          executeCommand(command)
          setCommandHistory(prev => [...prev, command])
          setHistoryIndex(-1)
        }
        currentCommandRef.current = ''
        writePrompt()
      } else if (char === 127 || char === 8) { // Backspace or Delete
        if (currentCommandRef.current.length > 0) {
          currentCommandRef.current = currentCommandRef.current.slice(0, -1)
          // Clear the line and rewrite the prompt with the new command
          xterm.write('\r\x1b[K') // Move to start of line and clear it
          xterm.write('$ ' + currentCommandRef.current)
        }
      } else if (char === 27) { // Escape sequences (arrow keys)
        // Handle arrow keys for command history
        if (data.length === 3) {
          if (data[2] === 'A') { // Up arrow
            if (historyIndex < commandHistory.length - 1) {
              const newIndex = historyIndex + 1
              const historyCommand = commandHistory[commandHistory.length - 1 - newIndex]
              setHistoryIndex(newIndex)
              currentCommandRef.current = historyCommand
              xterm.write('\r\x1b[K') // Clear line
              xterm.write('$ ' + historyCommand)
            }
          } else if (data[2] === 'B') { // Down arrow
            if (historyIndex > 0) {
              const newIndex = historyIndex - 1
              const historyCommand = commandHistory[commandHistory.length - 1 - newIndex]
              setHistoryIndex(newIndex)
              currentCommandRef.current = historyCommand
              xterm.write('\r\x1b[K') // Clear line
              xterm.write('$ ' + historyCommand)
            } else if (historyIndex === 0) {
              setHistoryIndex(-1)
              currentCommandRef.current = ''
              xterm.write('\r\x1b[K') // Clear line
              xterm.write('$ ')
            }
          }
        }
      } else if (char >= 32 && char <= 126) { // Printable characters
        currentCommandRef.current += data
        xterm.write(data)
      }
    })

    // Handle resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
    }
  }, []) // Remove dependencies that were causing re-initialization

  const writePrompt = () => {
    if (xtermRef.current) {
      xtermRef.current.write('$ ')
    }
  }

  const executeCommand = async (command) => {
    const xterm = xtermRef.current
    if (!xterm) return

    setLastCommand(command)

    try {
      // Send command to backend
      const response = await fetch('/api/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
      })

      const result = await response.json()

      if (result.output) {
        // Write command output to terminal
        xterm.writeln(result.output)
      }

      if (result.error) {
        xterm.writeln(`\x1b[31m${result.error}\x1b[0m`) // Red color for errors
      }

      // Update git state if command was successful
      if (result.gitState) {
        updateGitState(result.gitState)
      }

    } catch (error) {
      xterm.writeln(`\x1b[31mError: ${error.message}\x1b[0m`)
    }
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Terminal Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-400 ml-4">Terminal</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2 custom-scrollbar"
      />
    </div>
  )
}

export default Terminal 