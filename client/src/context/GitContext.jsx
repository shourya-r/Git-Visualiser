import React, { createContext, useContext, useReducer, useCallback } from 'react'

const GitContext = createContext()

const initialState = {
  commits: [],
  branches: [],
  currentBranch: 'main',
  head: null,
  index: [],
  workingDirectory: [],
  gitTree: null,
  lastCommand: null
}

function gitReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_GIT_STATE':
      return {
        ...state,
        ...action.payload
      }
    case 'SET_LAST_COMMAND':
      return {
        ...state,
        lastCommand: action.payload
      }
    case 'RESET_STATE':
      return initialState
    default:
      return state
  }
}

export function GitContextProvider({ children }) {
  const [state, dispatch] = useReducer(gitReducer, initialState)

  const updateGitState = useCallback((newState) => {
    dispatch({ type: 'UPDATE_GIT_STATE', payload: newState })
  }, [])

  const setLastCommand = useCallback((command) => {
    dispatch({ type: 'SET_LAST_COMMAND', payload: command })
  }, [])

  const resetGitState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' })
  }, [])

  const value = {
    ...state,
    updateGitState,
    setLastCommand,
    resetGitState
  }

  return (
    <GitContext.Provider value={value}>
      {children}
    </GitContext.Provider>
  )
}

export function useGitContext() {
  const context = useContext(GitContext)
  if (!context) {
    throw new Error('useGitContext must be used within a GitContextProvider')
  }
  return context
} 