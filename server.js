const express = require('express')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'client/dist')))

// Git state parser functions
function parseGitState() {
  const gitDir = path.join(process.cwd(), '.git')
  const state = {
    commits: [],
    branches: [],
    currentBranch: 'main',
    head: null,
    index: [],
    workingDirectory: []
  }

  try {
    // Parse HEAD
    if (fs.existsSync(path.join(gitDir, 'HEAD'))) {
      const headContent = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim()
      if (headContent.startsWith('ref: ')) {
        const refPath = headContent.split(' ')[1]
        state.currentBranch = refPath.split('/').pop()
        
        const refFile = path.join(gitDir, refPath)
        if (fs.existsSync(refFile)) {
          state.head = fs.readFileSync(refFile, 'utf-8').trim()
        }
      } else {
        state.head = headContent
      }
    }

    // Parse branches
    const refsDir = path.join(gitDir, 'refs', 'heads')
    if (fs.existsSync(refsDir)) {
      const branchFiles = fs.readdirSync(refsDir)
      for (const branchFile of branchFiles) {
        const branchPath = path.join(refsDir, branchFile)
        const sha = fs.readFileSync(branchPath, 'utf-8').trim()
        state.branches.push({
          name: branchFile,
          sha: sha
        })
      }
    }

    // Parse commits (walk from HEAD)
    if (state.head) {
      const commits = new Set()
      const queue = [state.head]
      
      while (queue.length > 0) {
        const commitSha = queue.shift()
        if (commits.has(commitSha)) continue
        
        const commit = parseCommitObject(commitSha)
        if (commit) {
          commits.add(commitSha)
          state.commits.push(commit)
          
          // Add parents to queue
          if (commit.parents) {
            queue.push(...commit.parents)
          }
        }
      }
    }

    // Parse index
    const indexPath = path.join(gitDir, 'index')
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8')
      const lines = indexContent.split('\n').filter(line => line.trim())
      for (const line of lines) {
        const [path, sha] = line.split(' ')
        state.index.push({ path, sha })
      }
    }

    // Parse working directory
    const workingFiles = getWorkingDirectoryFiles()
    state.workingDirectory = workingFiles

  } catch (error) {
    console.error('Error parsing git state:', error)
  }

  return state
}

function parseCommitObject(sha) {
  try {
    const objectPath = path.join(process.cwd(), '.git', 'objects', sha.slice(0, 2), sha.slice(2))
    if (!fs.existsSync(objectPath)) return null

    const zlib = require('zlib')
    const compressedContent = fs.readFileSync(objectPath)
    const decompressedContent = zlib.inflateSync(compressedContent)
    
    const nullIndex = decompressedContent.indexOf(0)
    const header = decompressedContent.subarray(0, nullIndex).toString()
    const content = decompressedContent.subarray(nullIndex + 1).toString()

    if (!header.startsWith('commit ')) return null

    const lines = content.split('\n')
    const commit = {
      sha,
      parents: [],
      tree: null,
      author: null,
      committer: null,
      message: null
    }

    let messageStartIndex = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('tree ')) {
        commit.tree = line.split(' ')[1]
      } else if (line.startsWith('parent ')) {
        commit.parents.push(line.split(' ')[1])
      } else if (line.startsWith('author ')) {
        commit.author = line.substring(7)
      } else if (line.startsWith('committer ')) {
        commit.committer = line.substring(10)
      } else if (line === '') {
        messageStartIndex = i + 1
        break
      }
    }

    commit.message = lines.slice(messageStartIndex).join('\n').trim()
    
    return commit
  } catch (error) {
    console.error('Error parsing commit object:', error)
    return null
  }
}

function getWorkingDirectoryFiles() {
  const files = []
  
  function scanDirectory(dirPath, relativePath = '') {
    try {
      const entries = fs.readdirSync(dirPath)
      for (const entry of entries) {
        if (entry === '.git' || entry === 'node_modules' || entry === 'client') continue
        
        const fullPath = path.join(dirPath, entry)
        const relPath = path.join(relativePath, entry)
        const stat = fs.statSync(fullPath)
        
        if (stat.isFile()) {
          files.push({
            path: relPath,
            size: stat.size,
            modified: stat.mtime
          })
        } else if (stat.isDirectory()) {
          scanDirectory(fullPath, relPath)
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error)
    }
  }
  
  scanDirectory(process.cwd())
  return files
}

// API Routes
app.post('/api/execute-command', (req, res) => {
  const { command } = req.body
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' })
  }

  // Parse the command with proper quote handling
  function parseCommand(cmd) {
    const args = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''
    
    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i]
      
      if ((char === '"' || char === "'") && !inQuotes) {
        // Start of quoted string
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        // End of quoted string
        inQuotes = false
        quoteChar = ''
      } else if (char === ' ' && !inQuotes) {
        // Space outside quotes - end current argument
        if (current.trim()) {
          args.push(current.trim())
          current = ''
        }
      } else {
        // Regular character
        current += char
      }
    }
    
    // Add final argument
    if (current.trim()) {
      args.push(current.trim())
    }
    
    return args
  }

  const args = parseCommand(command)
  const gitCommand = args[0]
  
  if (gitCommand !== 'git') {
    return res.json({ 
      error: 'Only git commands are supported',
      output: null,
      gitState: null
    })
  }

  // Execute the git command using our implementation
  const gitArgs = args.slice(1) // Remove 'git' from args
  
  try {
    const child = spawn('node', [path.join(__dirname, 'app/main.js'), ...gitArgs], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let output = ''
    let error = ''

    child.stdout.on('data', (data) => {
      output += data.toString()
    })

    child.stderr.on('data', (data) => {
      error += data.toString()
    })

    child.on('close', (code) => {
      // Parse the new git state after command execution
      const gitState = parseGitState()
      
      res.json({
        output: output.trim(),
        error: error.trim() || null,
        gitState,
        exitCode: code
      })
    })

    child.on('error', (err) => {
      res.json({
        output: null,
        error: `Failed to execute command: ${err.message}`,
        gitState: null
      })
    })

  } catch (err) {
    res.json({
      output: null,
      error: `Error: ${err.message}`,
      gitState: null
    })
  }
})

app.post('/api/save-file', (req, res) => {
  const { filename, content } = req.body
  
  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' })
  }

  try {
    const filePath = path.join(process.cwd(), filename)
    fs.writeFileSync(filePath, content)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: `Failed to save file: ${error.message}` })
  }
})

app.get('/api/list-files', (req, res) => {
  try {
    const files = []
    
    function scanDirectory(dirPath, relativePath = '') {
      try {
        const entries = fs.readdirSync(dirPath)
        for (const entry of entries) {
          // Skip system directories and files
          if (entry.startsWith('.') || 
              entry === 'node_modules' || 
              entry === 'client' || 
              entry === 'app' || 
              entry === 'server.js' ||
              entry === 'package.json' ||
              entry === 'package-lock.json') {
            continue
          }
          
          const fullPath = path.join(dirPath, entry)
          const relPath = relativePath ? path.join(relativePath, entry) : entry
          const stat = fs.statSync(fullPath)
          
          if (stat.isFile()) {
            // Only show .txt files
            if (path.extname(entry).toLowerCase() === '.txt') {
              files.push({
                name: relPath,
                size: stat.size,
                modified: stat.mtime.toISOString()
              })
            }
          } else if (stat.isDirectory()) {
            // Only scan user directories (not system ones)
            if (!entry.startsWith('.') && 
                entry !== 'node_modules' && 
                entry !== 'client' && 
                entry !== 'app') {
              scanDirectory(fullPath, relPath)
            }
          }
        }
      } catch (error) {
        console.error('Error scanning directory:', error)
      }
    }
    
    scanDirectory(process.cwd())
    
    // If no txt files exist, create some default ones for users to play with
    if (files.length === 0) {
      const defaultFiles = [
        {
          name: 'welcome.txt',
          content: `Welcome to Git Visualizer!

This is your playground for learning Git commands.
You can edit this file and create new .txt files to experiment with Git.

Try these commands in the terminal:
1. git init
2. git add welcome.txt
3. git commit -m "Initial commit"
4. git branch feature
5. git checkout feature

Have fun learning Git!`
        },
        {
          name: 'notes.txt',
          content: `My Git Learning Notes

This is a sample file for practicing Git commands.
You can:
- Edit this content
- Save the file (auto-saves in 2 seconds)
- Use git commands to track changes
- Create branches and merge them

Try making some changes and committing them!`
        }
      ]
      
      // Create the default files on disk
      for (const file of defaultFiles) {
        try {
          const filePath = path.join(process.cwd(), file.name)
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.content)
            const stat = fs.statSync(filePath)
            files.push({
              name: file.name,
              size: stat.size,
              modified: stat.mtime.toISOString()
            })
          }
        } catch (error) {
          console.error(`Failed to create default file ${file.name}:`, error)
        }
      }
    }
    
    res.json(files)
  } catch (error) {
    res.status(500).json({ error: `Failed to list files: ${error.message}` })
  }
})

app.get('/api/get-file', (req, res) => {
  const { filename } = req.query
  
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' })
  }

  try {
    const filePath = path.join(process.cwd(), filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    const content = fs.readFileSync(filePath, 'utf-8')
    res.type('text/plain').send(content)
  } catch (error) {
    res.status(500).json({ error: `Failed to read file: ${error.message}` })
  }
})

app.get('/api/git-state', (req, res) => {
  try {
    const gitState = parseGitState()
    res.json(gitState)
  } catch (error) {
    res.status(500).json({ error: `Failed to get git state: ${error.message}` })
  }
})

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Git Visualizer server running on port ${PORT}`)
  console.log(`Frontend: http://localhost:${PORT}`)
  console.log(`API: http://localhost:${PORT}/api`)
}) 