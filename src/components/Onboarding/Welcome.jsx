import { Shield } from 'lucide-react'

export default function Welcome({ onNext }) {
  return (
    <div className="text-center">
      <Shield className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-white mb-3">Welcome to CustodyCase.ai</h2>
      <p className="text-slate-400 mb-2">
        A local-first document analyzer that helps you organize custody evidence,
        identify patterns, and prepare for mediation.
      </p>
      <ul className="text-sm text-slate-500 space-y-2 text-left mt-6 mb-8">
        <li className="flex items-start gap-2">
          <span className="text-indigo-400 mt-0.5">&#10003;</span>
          All processing happens locally on your computer
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400 mt-0.5">&#10003;</span>
          Documents are encrypted with your passphrase
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400 mt-0.5">&#10003;</span>
          No data ever leaves your machine
        </li>
      </ul>
      <button
        onClick={onNext}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
      >
        Get Started
      </button>
    </div>
  )
}
