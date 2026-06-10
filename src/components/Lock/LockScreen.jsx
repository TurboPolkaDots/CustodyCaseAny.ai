import { useState } from 'react'
import { Lock, Shield } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export default function LockScreen() {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setDbUnlocked } = useAppStore()

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!passphrase) return

    setLoading(true)
    setError('')
    try {
      const result = await window.api.invoke('db:unlock', passphrase)
      if (result.success) {
        setDbUnlocked(true)
      } else {
        setError('Incorrect passphrase')
        setPassphrase('')
      }
    } catch {
      setError('Failed to unlock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto text-center">
        <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-1">CustodyCase.ai</h2>
        <p className="text-slate-500 text-sm mb-8">Enter your passphrase to unlock</p>

        <form onSubmit={handleUnlock}>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={!passphrase || loading}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
