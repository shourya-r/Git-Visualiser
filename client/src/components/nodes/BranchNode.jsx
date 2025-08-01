import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { GitBranch, Star } from 'lucide-react'

const BranchNode = ({ data }) => {
  const { name, sha, isCurrent } = data

  return (
    <div className={`px-3 py-2 shadow-lg rounded-lg border-2 min-w-[120px] ${
      isCurrent 
        ? 'bg-git-green border-git-green text-white' 
        : 'bg-gray-700 border-gray-500 text-gray-200'
    }`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className={`w-3 h-3 border-2 border-white ${
          isCurrent ? 'bg-git-green' : 'bg-gray-500'
        }`}
      />
      
      <div className="flex items-center space-x-2 mb-1">
        <GitBranch size={14} />
        {isCurrent && <Star size={12} className="text-yellow-400" />}
      </div>
      
      <div className="text-sm font-medium mb-1">
        {name}
      </div>
      
      <div className="text-xs opacity-75 font-mono">
        {sha ? sha.slice(0, 7) : 'no commits'}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`w-3 h-3 border-2 border-white ${
          isCurrent ? 'bg-git-green' : 'bg-gray-500'
        }`}
      />
    </div>
  )
}

export default memo(BranchNode) 