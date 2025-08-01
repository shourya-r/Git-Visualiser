import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { GitCommit, Crown } from 'lucide-react'

const CommitNode = ({ data }) => {
  const { sha, message, author, timestamp, isHead } = data

  return (
    <div className={`px-3 py-2 shadow-lg rounded-lg border-2 bg-gray-800 text-white min-w-[160px] ${
      isHead ? 'border-git-green' : 'border-gray-600'
    }`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-git-blue border-2 border-white"
      />
      
      <div className="flex items-center space-x-2 mb-1">
        <GitCommit size={14} className="text-git-blue" />
        {isHead && <Crown size={12} className="text-git-green" />}
        <span className="font-mono text-xs text-gray-400">
          {sha.slice(0, 7)}
        </span>
      </div>
      
      <div className="text-sm font-medium text-white mb-1 truncate">
        {message}
      </div>
      
      <div className="text-xs text-gray-400 truncate">
        {author}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-git-blue border-2 border-white"
      />
    </div>
  )
}

export default memo(CommitNode) 