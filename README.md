# ResearchPR

## Progressive Web App

Build and deploy the app over HTTPS to enable installation. Supported browsers show an **Install app** action; on iPhone and iPad, use **How to install** and follow the Safari Home Screen steps.

The service worker provides an offline app shell and caches same-origin static assets after they are requested. After a signed-in online visit, the app also loads its study pages so their code is available offline. It does not cache Supabase requests; the separate offline household-data feature below stores an account-scoped copy in browser IndexedDB.

## Offline household data

After signing in and loading your household while online, the app saves a copy of your household and appliances in this browser's IndexedDB. You can view and edit that copy offline. Queued changes sync to Supabase when the device reconnects. If the online record changed in the meantime, the app pauses that change and lets you choose the device copy or the online copy.

Offline data is stored on the device and is not encrypted by this app. Avoid using offline mode on shared or untrusted devices. Keep the app signed in until queued changes have synced or conflicts have been resolved. A first-time sign-in and the first data download require an internet connection. Browser storage can be cleared by the user or browser, so offline data is not a backup.
