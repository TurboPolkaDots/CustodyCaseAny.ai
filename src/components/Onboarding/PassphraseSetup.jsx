import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function PassphraseSetup({ onNext, onBack }) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValid = passphrase.length >= 8 && passphrase === confirm

  const handleSetup = async () => {
    if (passphrase !== confirm) {
      setError('Passphrases do not match')
      return
    }
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await window.api.invoke('passphrase:setup', passphrase)
      if (result.success) {
        onNext()
      } else {
        setError(result.error || 'Failed to set up encryption')
      }
    } catch (err) {
      setError('Failed to set up encryption')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-6 h-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Set Encryption Passphrase</h2>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Your documents will be encrypted locally. Choose a strong passphrase you will remember
        &mdash; there is no recovery option.
      </p>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm text-slate-300 mb-1">Passphrase</label>
          <input
            type={show ? 'text' : 'password'}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-8 text-slate-500 hover:text-slate-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Confirm Passphrase</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter passphrase"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {passphrase.length > 0 && passphrase.length < 8 && (
        <p className="text-yellow-500 text-xs mt-2">Passphrase must be at least 8 characters</p>
      )}
      {confirm.length > 0 && passphrase !== confirm && (
        <p className="text-red-400 text-xs mt-2">Passphrases do not match</p>
      )}
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSetup}
          disabled={!isValid || loading}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Setting up...' : 'Set Passphrase'}
        </button>
      </div>
    </div>
  )
}
