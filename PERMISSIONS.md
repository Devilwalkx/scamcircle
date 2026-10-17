# Permissions

Verified once by `npx expo prebuild --platform android --no-install` and re-checked in CI against the generated `AndroidManifest.xml`. The test `packages/core/test/appconfig.test.ts` asserts the config.

| Permission | Status | Reason |
|---|---|---|
| `INTERNET` | **blocked** | The app never needs the network. Blocking it means the installed app cannot send anything. (Expo adds it by default.) |
| `CAMERA`, `RECORD_AUDIO` | blocked | Not used |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` | blocked | Not used |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | blocked | Not used |
| `SYSTEM_ALERT_WINDOW`, `VIBRATE` | blocked | Added by tooling for developer menus; not needed |
| Photo library | **no permission declared** | `expo-image-picker` uses the system photo picker on current Android; the person chooses one picture and the app gets only that |
| Notifications, contacts, SMS, call log, accessibility service, overlay | not requested | The app does not read other apps, contacts or messages |

Result in the generated manifest at the time of writing: every permission above appears only as `tools:node="remove"`, and no `uses-permission` remains active.

iOS: not built or tested. The config keeps a placeholder bundle id.

Web build: asks for no browser permission. Clipboard use happens only when the person taps Copy or Paste.
