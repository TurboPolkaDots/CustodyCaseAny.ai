import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import Welcome from './Welcome'
import CaseSetup from './CaseSetup'
import PassphraseSetup from './PassphraseSetup'
import FolderSetup from './FolderSetup'
import OllamaCheck from './OllamaCheck'

const steps = ['welcome', 'case', 'passphrase', 'folder', 'ollama']

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [caseInfo, setCaseInfo] = useState({ caseName: '', caseNumber: '', jurisdiction: '', caseType: 'modification' })
  const [folderPath, setFolderPath] = useState('')
  const { setOnboardingComplete, setDbUnlocked, setCaseInfo: storeSetCaseInfo, setConfig } = useAppStore()

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const complete = async () => {
    const config = {
      onboardingComplete: true,
      caseInfo,
      folderPath,
      createdAt: new Date().toISOString()
    }
    await window.api.invoke('config:save', config)
    setConfig(config)
    storeSetCaseInfo(caseInfo)
    setOnboardingComplete(true)
    setDbUnlocked(true)
  }

  const currentStep = steps[step]

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto">
        {/* Progress */}
        <div className="flex gap-2 mb-8 px-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-indigo-500' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          {currentStep === 'welcome' && <Welcome onNext={next} />}
          {currentStep === 'case' && (
            <CaseSetup caseInfo={caseInfo} setCaseInfo={setCaseInfo} onNext={next} onBack={back} />
          )}
          {currentStep === 'passphrase' && <PassphraseSetup onNext={next} onBack={back} />}
          {currentStep === 'folder' && (
            <FolderSetup folderPath={folderPath} setFolderPath={setFolderPath} onNext={next} onBack={back} />
          )}
          {currentStep === 'ollama' && <OllamaCheck onComplete={complete} onBack={back} />}
        </div>
      </div>
    </div>
  )
}
