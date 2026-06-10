import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Onboarding state
  onboardingComplete: false,
  setOnboardingComplete: (val) => set({ onboardingComplete: val }),

  // Case info
  caseInfo: null,
  setCaseInfo: (info) => set({ caseInfo: info }),
  getCaseType: () => get().caseInfo?.caseType || 'modification',

  // Database state
  dbUnlocked: false,
  setDbUnlocked: (val) => set({ dbUnlocked: val }),

  // Ollama state
  ollamaState: { connected: false, models: [] },
  setOllamaState: (state) => set({ ollamaState: state }),

  // Active jobs
  activeJobs: [],
  addJob: (job) => set((s) => ({ activeJobs: [...s.activeJobs, job] })),
  removeJob: (id) => set((s) => ({ activeJobs: s.activeJobs.filter((j) => j.id !== id) })),
  updateJob: (id, updates) =>
    set((s) => ({
      activeJobs: s.activeJobs.map((j) => (j.id === id ? { ...j, ...updates } : j))
    })),

  // Report generation (persists across navigation)
  report: {
    generating: false,
    currentStep: null,
    stepStatus: {},
    progress: '',
    error: '',
    done: false
  },
  updateReport: (updates) => set((s) => ({ report: { ...s.report, ...updates } })),

  generateReport: async (judgmentDocId) => {
    const { updateReport, getCaseType } = get()
    const caseType = getCaseType()
    const isInitial = caseType === 'initial'

    if (!isInitial && !judgmentDocId) {
      updateReport({ error: 'Please select your judgment/settlement document' })
      return
    }

    updateReport({
      generating: true, error: '', done: false,
      currentStep: null, stepStatus: {}, progress: ''
    })

    const updateStep = (key, status) => {
      const prev = get().report.stepStatus
      updateReport({ currentStep: key, stepStatus: { ...prev, [key]: status } })
    }

    try {
      await window.api.invoke('power:keep-awake')

      // Check what already exists to skip redundant work
      const existingObligations = await window.api.invoke('obligations:list')
      const existingEvents = await window.api.invoke('timeline:events')

      // Step 1: Parse Judgment / Check Key Issues
      updateStep('judgment', 'running')
      if (isInitial) {
        if (existingObligations.length > 0) {
          updateReport({ progress: `Using ${existingObligations.length} existing key issues` })
          await new Promise((r) => setTimeout(r, 500))
        } else {
          throw new Error('No key issues defined. Go to the Key Issues page and add at least one issue before generating a report.')
        }
      } else {
        if (existingObligations.length > 0) {
          updateReport({ progress: `Using ${existingObligations.length} existing obligations (cached)` })
          await new Promise((r) => setTimeout(r, 500))
        } else {
          // Re-extract text from source file to ensure latest extraction code is used (.doc fix)
          updateReport({ progress: 'Re-extracting judgment text...' })
          await window.api.invoke('documents:process', judgmentDocId)
          updateReport({ progress: 'Parsing judgment into obligations...' })
          const judgmentResult = await window.api.invoke('judgment:parse', judgmentDocId)
          if (judgmentResult?.error) throw new Error(judgmentResult.error)
          if (!judgmentResult?.obligations?.length) throw new Error('No obligations found in judgment. Try deleting and re-uploading the document.')
        }
      }
      updateStep('judgment', 'done')

      // Step 2: Build Timeline
      updateStep('timeline', 'running')
      if (existingEvents.length > 0) {
        updateReport({ progress: `Using ${existingEvents.length} existing timeline events (cached)` })
        await new Promise((r) => setTimeout(r, 500))
      } else {
        updateReport({ progress: 'Extracting timeline events from all documents...' })
        const timelineResult = await window.api.invoke('timeline:build')
        if (timelineResult?.error) throw new Error(timelineResult.error)
      }
      updateStep('timeline', 'done')

      // Step 3: Detect Violations / Find Evidence
      updateStep('violations', 'running')
      updateReport({ progress: isInitial ? 'Finding supporting evidence...' : 'Comparing evidence against obligations...' })
      const violationsResult = await window.api.invoke('violations:detect')
      if (violationsResult?.error) throw new Error(violationsResult.error)
      updateStep('violations', 'done')

      // Step 4: Group Patterns / Identify Themes
      updateStep('patterns', 'running')
      updateReport({ progress: isInitial ? 'Identifying key themes...' : 'Identifying recurring patterns...' })
      const patternsResult = await window.api.invoke('patterns:group')
      if (patternsResult?.error) throw new Error(patternsResult.error)
      updateStep('patterns', 'done')

      // Step 5: Generate Outline
      updateStep('outline', 'running')
      updateReport({ progress: isInitial ? 'Writing case outline...' : 'Writing mediation outline...' })
      await window.api.invoke('outline:generate')
      updateStep('outline', 'done')

      updateReport({ progress: '', done: true })
    } catch (err) {
      const step = get().report.currentStep
      const prev = get().report.stepStatus
      updateReport({
        error: err.message || 'Report generation failed',
        stepStatus: step ? { ...prev, [step]: 'error' } : prev
      })
    } finally {
      await window.api.invoke('power:allow-sleep')
      updateReport({ generating: false })
    }
  },

  // Auto-lock timer
  lastActivity: Date.now(),
  touchActivity: () => set({ lastActivity: Date.now() }),

  // Config
  config: null,
  setConfig: (config) => set({ config }),

  // Initialize from stored config
  initFromConfig: async () => {
    try {
      const config = await window.api.invoke('config:load')
      if (config && config.onboardingComplete) {
        set({
          config,
          onboardingComplete: true,
          caseInfo: config.caseInfo || null
        })
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }
}))
