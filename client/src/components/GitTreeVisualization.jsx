import { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow'
import dagre from 'dagre'
import { useGitContext } from '../context/GitContext'
import CommitNode from './nodes/CommitNode'
import BranchNode from './nodes/BranchNode'
import TreeNode from './nodes/TreeNode'

import 'reactflow/dist/style.css'

const nodeTypes = {
  commit: CommitNode,
  branch: BranchNode,
  tree: TreeNode,
}

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const nodeWidth = 172
const nodeHeight = 60

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = isHorizontal ? 'left' : 'top'
    node.sourcePosition = isHorizontal ? 'right' : 'bottom'
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    }
    return node
  })

  return { nodes, edges }
}

function GitTreeVisualization() {
  const { commits, branches, currentBranch, head, lastCommand } = useGitContext()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [layoutDirection, setLayoutDirection] = useState('TB')

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Convert git state to nodes and edges
  useEffect(() => {
    const newNodes = []
    const newEdges = []

    // Create commit nodes
    commits.forEach((commit, index) => {
      newNodes.push({
        id: commit.sha,
        type: 'commit',
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          timestamp: commit.timestamp,
          isHead: commit.sha === head,
        },
      })

      // Create edges between commits (parent relationships)
      if (commit.parents && commit.parents.length > 0) {
        commit.parents.forEach(parentSha => {
          newEdges.push({
            id: `${parentSha}-${commit.sha}`,
            source: parentSha,
            target: commit.sha,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#6b7280',
            },
            style: {
              strokeWidth: 2,
              stroke: '#6b7280',
            },
          })
        })
      }
    })

    // Create branch nodes
    branches.forEach((branch) => {
      newNodes.push({
        id: `branch-${branch.name}`,
        type: 'branch',
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          name: branch.name,
          sha: branch.sha,
          isCurrent: branch.name === currentBranch,
        },
      })

      // Connect branch to its commit
      if (branch.sha) {
        newEdges.push({
          id: `branch-${branch.name}-${branch.sha}`,
          source: `branch-${branch.name}`,
          target: branch.sha,
          type: 'straight',
          style: {
            strokeWidth: 2,
            stroke: branch.name === currentBranch ? '#10b981' : '#6b7280',
            strokeDasharray: '5,5',
          },
        })
      }
    })

    // Layout the graph
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges,
      layoutDirection
    )

    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [commits, branches, currentBranch, head, layoutDirection])

  const toggleLayoutDirection = () => {
    setLayoutDirection(prev => prev === 'TB' ? 'LR' : 'TB')
  }

  return (
    <div className="h-full bg-gray-900 relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <button
          onClick={toggleLayoutDirection}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
        >
          {layoutDirection === 'TB' ? '📊 Horizontal' : '📈 Vertical'}
        </button>
      </div>

      {/* Git State Info */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800 border border-gray-600 rounded p-3">
        <div className="text-sm space-y-1">
          <div className="text-gray-300">
            <span className="text-git-green">●</span> Current: <span className="font-mono">{currentBranch}</span>
          </div>
          <div className="text-gray-300">
            HEAD: <span className="font-mono text-xs">{head ? head.slice(0, 7) : 'none'}</span>
          </div>
          {lastCommand && (
            <div className="text-gray-400 text-xs">
              Last: <span className="font-mono">{lastCommand}</span>
            </div>
          )}
        </div>
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-900"
      >
        <Controls className="bg-gray-800 border-gray-600" />
        <MiniMap 
          className="bg-gray-800 border border-gray-600"
          nodeColor={(node) => {
            switch (node.type) {
              case 'commit': return '#3b82f6'
              case 'branch': return '#10b981'
              case 'tree': return '#f59e0b'
              default: return '#6b7280'
            }
          }}
        />
        <Background color="#374151" gap={16} />
      </ReactFlow>
    </div>
  )
}

export default GitTreeVisualization 