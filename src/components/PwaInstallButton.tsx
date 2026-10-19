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

type InstallPlatform = 'apple-mobile' | 'apple-desktop' | 'chromium' | null

export function PwaInstallButton({
  dark = false,
  compactOnMobile = false,
}: {
  dark?: boolean
  compactOnMobile?: boolean
}) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [installPlatform, setInstallPlatform] = useState<InstallPlatform>(null)
  const [showInstallInstructions, setShowInstallInstructions] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent
    const isAppleMobile = /iPhone|iPad|iPod/.test(userAgent)
      || (userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
    const isMacSafari = userAgent.includes('Mac')
      && /Safari/.test(userAgent)
      && !/Chrome|Chromium|Edg|OPR/.test(userAgent)
    const isChromium = /Chrome|Chromium|Edg|OPR/.test(userAgent)

    if (isAppleMobile) setInstallPlatform('apple-mobile')
    else if (isMacSafari) setInstallPlatform('apple-desktop')
    else if (isChromium) setInstallPlatform('chromium')

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

  if (!installPrompt && !installPlatform && !status) return null

  const installInstructions = installPlatform === 'apple-mobile'
    ? {
        title: 'Add this app to your Home Screen',
        steps: ['Open this page in Safari and tap Share.', 'Choose “Add to Home Screen”.', 'Tap “Add” to finish.'],
      }
    : installPlatform === 'apple-desktop'
      ? {
          title: 'Add this app to your Dock',
          steps: ['Open this page in Safari.', 'From the menu bar, choose File, then Add to Dock.', 'Confirm the app name and choose Add.'],
        }
      : {
          title: 'Install from your browser',
          steps: ['Open the browser menu or address-bar install icon.', 'Choose “Install app” or “Install this site as an app”.', 'Follow the browser prompt to finish.'],
        }

  return (
    <div className="relative shrink-0">
      {(installPrompt || installPlatform) && (
        <button
          type="button"
          onClick={() => void installApp()}
          disabled={installing}
          aria-expanded={installPlatform && !installPrompt ? showInstallInstructions : undefined}
          aria-controls={installPlatform && !installPrompt ? 'pwa-install-instructions' : undefined}
          aria-label={installing ? 'Opening install prompt' : 'Install app'}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition disabled:opacity-60 ${
            compactOnMobile ? 'size-10 px-0 sm:size-auto sm:px-3' : 'px-3'
          } ${
            dark
              ? 'border-white/20 text-white hover:bg-white/10'
              : 'border-blue-200 bg-white text-blue-800 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          <Download size={15} aria-hidden="true" />
          <span className={compactOnMobile ? 'sr-only sm:not-sr-only' : undefined}>
            {installing ? 'Opening…' : 'Install app'}
          </span>
        </button>
      )}
      {showInstallInstructions && installPlatform && !installPrompt && (
        <div
          id="pwa-install-instructions"
          role="dialog"
          aria-label={installInstructions.title}
          className={`absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-4 text-left text-xs shadow-xl ${
            dark ? 'border-white/15 bg-[#171717] text-neutral-100' : 'border-blue-200 bg-white text-blue-900'
          }`}
        >
          <p className="font-semibold">{installInstructions.title}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 leading-5">
            {installInstructions.steps.map((step) => <li key={step}>{step}</li>)}
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
