import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Folder, FileText } from 'lucide-react'

const TreeNode = ({ data }) => {
  const { sha, type, name, mode, children } = data

  return (
    <div className="px-3 py-2 shadow-lg rounded-lg border-2 bg-amber-800 border-amber-600 text-white min-w-[140px]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-amber-500 border-2 border-white"
      />
      
      <div className="flex items-center space-x-2 mb-1">
        {type === 'tree' ? (
          <Folder size={14} className="text-amber-300" />
        ) : (
          <FileText size={14} className="text-amber-300" />
        )}
        <span className="font-mono text-xs text-amber-200">
          {sha.slice(0, 7)}
        </span>
      </div>
      
      <div className="text-sm font-medium text-white mb-1">
        {name}
      </div>
      
      <div className="text-xs text-amber-200">
        {mode} {type}
      </div>
      
      {children && children.length > 0 && (
        <div className="text-xs text-amber-300 mt-1">
          {children.length} items
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-amber-500 border-2 border-white"
      />
    </div>
  )
}

export default memo(TreeNode) 