'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AuthKitProvider, SignInButton, useProfile } from '@farcaster/auth-kit'
import { FrameProvider, useFrame } from './FrameProvider'

const FarcasterContext = createContext({
  farcasterUser: null,
  isAuthenticated: false,
  signOut: () => { },
  profile: null
})

// Separate component to access useProfile hook
function FarcasterProfileSync({ onProfileUpdate }) {
  const { isAuthenticated, profile } = useProfile()

  useEffect(() => {
    if (isAuthenticated && profile) {
      onProfileUpdate(profile)
    } else {
      onProfileUpdate(null)
    }
  }, [isAuthenticated, profile, onProfileUpdate])

  return null
}

function FarcasterContextController({ children }) {
  const [farcasterUser, setFarcasterUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { user: frameUser, isSDKLoaded } = useFrame()

  // Load user from localStorage on mount
  useEffect(() => {
    // If we have a frame user, they are authenticated automatically
    if (frameUser) {
      setFarcasterUser({
        fid: frameUser.fid,
        username: frameUser.username,
        displayName: frameUser.displayName,
        pfpUrl: frameUser.pfpUrl,
        // Map other fields as needed
      })
      setIsAuthenticated(true)
      return
    }

    const storedUser = localStorage.getItem('farcasterUser')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setFarcasterUser(user)
        setIsAuthenticated(true)
      } catch (e) {
        console.error('Failed to parse stored Farcaster user:', e)
        localStorage.removeItem('farcasterUser')
      }
    }
  }, [frameUser]) // Re-run if frameUser loads

  const handleProfileUpdate = useCallback((profile) => {
    // Ignore AuthKit updates if we are in a Frame
    if (frameUser) return

    if (profile) {
      const userData = {
        fid: profile.fid,
        username: profile.username,
        displayName: profile.displayName,
        pfpUrl: profile.pfp?.url,
        bio: profile.bio,
        custody: profile.custody,
        verifications: profile.verifications
      }
      setFarcasterUser(userData)
      setIsAuthenticated(true)
      localStorage.setItem('farcasterUser', JSON.stringify(userData))
    } else {
      setFarcasterUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('farcasterUser')
    }
  }, [frameUser])

  const signOut = useCallback(() => {
    // Cannot sign out of Frame context effectively, but clear local state
    setFarcasterUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('farcasterUser')
  }, [])

  return (
    <>
      <FarcasterProfileSync onProfileUpdate={handleProfileUpdate} />
      <FarcasterContext.Provider
        value={{
          farcasterUser,
          isAuthenticated,
          signOut,
          profile: farcasterUser,
          isFrameContext: !!frameUser
        }}
      >
        {children}
      </FarcasterContext.Provider>
    </>
  )
}

export function FarcasterProvider({ children }) {
  const config = {
    rpcUrl: 'https://mainnet.optimism.io',
    domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
    siweUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  }

  return (
    <AuthKitProvider config={config}>
      <FrameProvider>
        <FarcasterContextController>
          {children}
        </FarcasterContextController>
      </FrameProvider>
    </AuthKitProvider>
  )
}

export function useFarcaster() {
  const context = useContext(FarcasterContext)
  if (!context) {
    throw new Error('useFarcaster must be used within FarcasterProvider')
  }
  return context
}

// Export SignInButton for convenience
export { SignInButton }
