# Git Visualizer

A visual web interface for a custom Git implementation built from scratch. This project combines a fully functional Git implementation with a modern React-based visualization tool.

## Features

### 🛠️ Complete Git Implementation
- **Object Storage**: SHA-1 content-addressable storage with zlib compression
- **Core Commands**: `init`, `add`, `commit`, `branch`, `checkout`, `merge`
- **Plumbing Commands**: `cat-file`, `hash-object`, `ls-tree`, `write-tree`, `commit-tree`
- **Advanced Features**: Three-way merges, fast-forward detection, merge base calculation

### 🎨 Visual Web Interface
- **Split Layout**: Code editor and terminal on the left, Git tree visualization on the right
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Interactive Terminal**: Execute Git commands with real-time output
- **Dynamic Visualization**: See your Git history update in real-time as you make changes
- **Responsive Design**: Modern UI built with React and Tailwind CSS

### 🌳 Git Tree Visualization
- **Commit Graph**: Visual representation of commit history with parent relationships
- **Branch Visualization**: See all branches and their current positions
- **Interactive Nodes**: Hover and explore commits, branches, and tree objects
- **Layout Options**: Switch between vertical and horizontal layouts
- **Real-time Updates**: Visualization updates automatically after each Git command

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm run setup
   ```

2. **Initialize a Git repository:**
   ```bash
   node app/main.js init
   ```

3. **Build the client:**
   ```bash
   npm run build
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   Navigate to `http://localhost:8080`

## Development

### Running in Development Mode

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, start the client development server:**
   ```bash
   cd client
   npm run dev
   ```

The client will run on `http://localhost:3000` and proxy API requests to the server on port 8080.

## Usage Guide

### Getting Started
1. **Create files**: Use the editor to create and edit files
2. **Save files**: Click the "Save" button to write files to disk
3. **Use Git commands**: Switch to the terminal tab and run Git commands:
   ```bash
   git add filename.txt
   git commit -m "Your commit message"
   git branch feature-branch
   git checkout feature-branch
   ```
4. **Watch the visualization**: See your Git history come to life in the right panel

### Supported Git Commands

#### Porcelain Commands (High-level)
- `git init` - Initialize a new repository
- `git add <file>` - Stage files for commit
- `git commit -m "<message>"` - Create a new commit
- `git branch [name]` - List or create branches
- `git checkout <branch>` - Switch branches
- `git merge <branch>` - Merge branches

#### Plumbing Commands (Low-level)
- `git cat-file -p <sha>` - Show object content
- `git cat-file -t <sha>` - Show object type
- `git hash-object [-w] <file>` - Hash and optionally store objects
- `git ls-tree [--name-only] <sha>` - List tree contents
- `git write-tree` - Create tree object from index
- `git commit-tree <tree> [-p <parent>] -m "<message>"` - Create commit object

### Example Workflow

1. **Initialize repository:**
   ```bash
   git init
   ```

2. **Create and edit a file in the editor**

3. **Stage the file:**
   ```bash
   git add example.txt
   ```

4. **Commit the changes:**
   ```bash
   git commit -m "Initial commit"
   ```

5. **Create a new branch:**
   ```bash
   git branch feature
   ```

6. **Switch to the new branch:**
   ```bash
   git checkout feature
   ```

7. **Make more changes and commits**

8. **Merge back to main:**
   ```bash
   git checkout main
   git merge feature
   ```

## Architecture

### Frontend (`client/`)
- **React + Vite**: Modern React setup with fast development
- **Tailwind CSS**: Utility-first CSS framework
- **Monaco Editor**: VS Code's editor for the web
- **XTerm.js**: Full-featured terminal emulator
- **ReactFlow**: Powerful library for building node-based graphs
- **Dagre**: Automatic graph layout algorithm

### Backend (`server.js`)
- **Express.js**: Web server framework
- **Git State Parser**: Reads and parses `.git` directory structure
- **Command Executor**: Runs Git commands using the custom implementation
- **API Layer**: RESTful API for frontend communication

### Git Implementation (`app/`)
- **Command Pattern**: Each Git command is a separate class
- **Object Storage**: Implements Git's object database
- **Index Management**: Handles staging area operations
- **Branch Management**: Reference and HEAD management
- **Merge Algorithm**: Implements merge base detection and three-way merges

## API Endpoints

- `POST /api/execute-command` - Execute Git commands
- `POST /api/save-file` - Save file content to disk
- `GET /api/git-state` - Get current Git repository state

## File Structure

```
├── app/                    # Git implementation
│   ├── git/
│   │   ├── commands/      # Git command implementations
│   │   └── client.js      # Git client
│   └── main.js            # CLI entry point
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context
│   │   └── ...
│   └── ...
├── server.js              # Express backend
└── package.json           # Project dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built as an educational project to understand Git internals
- Inspired by the CodeCrafters "Build your own Git" challenge
- Uses modern web technologies for visualization
