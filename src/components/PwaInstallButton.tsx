import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent
  }
}

export function PwaInstallButton({ dark = false }: { dark?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [manualInstallAvailable, setManualInstallAvailable] = useState(false)
  const [showInstallInstructions, setShowInstallInstructions] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent
    setManualInstallAvailable(
      /iPhone|iPad|iPod/.test(userAgent)
      || (userAgent.includes('Mac') && navigator.maxTouchPoints > 1),
    )

    function captureInstallPrompt(event: InstallPromptEvent) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    function handleAppInstalled() {
      setInstallPrompt(null)
      setStatus('App installed.')
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) {
      setShowInstallInstructions((visible) => !visible)
      return
    }
    setInstalling(true)
    setStatus(null)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setStatus(choice.outcome === 'accepted' ? 'Installation accepted.' : 'Installation was dismissed.')
      setInstallPrompt(null)
    } catch (cause) {
      console.error('Could not open the PWA installation prompt.', cause)
      setStatus('Could not open the install prompt. Try your browser menu instead.')
      setInstallPrompt(null)
    } finally {
      setInstalling(false)
    }
  }

  if (!installPrompt && !manualInstallAvailable && !status) return null

  return (
    <div className="relative shrink-0">
      {(installPrompt || manualInstallAvailable) && (
        <button
          type="button"
          onClick={() => void installApp()}
          disabled={installing}
          aria-expanded={manualInstallAvailable && !installPrompt ? showInstallInstructions : undefined}
          aria-controls={manualInstallAvailable && !installPrompt ? 'pwa-install-instructions' : undefined}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
            dark
              ? 'border-white/20 text-white hover:bg-white/10'
              : 'border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          <Download size={15} aria-hidden="true" />
          {installing ? 'Opening…' : manualInstallAvailable && !installPrompt ? 'How to install' : 'Install app'}
        </button>
      )}
      {showInstallInstructions && manualInstallAvailable && !installPrompt && (
        <div
          id="pwa-install-instructions"
          role="dialog"
          aria-label="How to install Pagsibol Energy"
          className={`absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-4 text-left text-xs shadow-xl ${
            dark ? 'border-white/15 bg-[#171717] text-neutral-100' : 'border-blue-200 bg-white text-blue-900'
          }`}
        >
          <p className="font-semibold">Add this app to your Home Screen</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 leading-5">
            <li>Open this page in Safari and tap Share.</li>
            <li>Choose “Add to Home Screen”.</li>
            <li>Tap “Add” to finish.</li>
          </ol>
          <button
            type="button"
            onClick={() => setShowInstallInstructions(false)}
            className={`mt-3 rounded-lg px-2 py-1 font-semibold ${
              dark ? 'text-amber-300 hover:bg-white/10' : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            Close
          </button>
        </div>
      )}
      {status && (
        <span
          role="status"
          className={`absolute right-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border px-3 py-2 text-xs shadow-lg ${
            dark ? 'border-white/15 bg-[#171717] text-neutral-100' : 'border-blue-200 bg-white text-blue-900'
          }`}
        >
          {status}
        </span>
      )}
    </div>
  )
}
