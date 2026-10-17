#!/usr/bin/env bash
# Runs inside the Android emulator job. Everything it measures is written to $OUT; nothing here is a claim by itself.
set -u
PKG=app.devilwalkx.scamcircle
APK=${APK:?path to apk}
OUT=${OUT:-out}
FONT=${FONT:-1.0}
NIGHT=${NIGHT:-no}
PREV_APK=${PREV_APK:-}
mkdir -p "$OUT/shots" "$OUT/junit" "$OUT/hierarchy"
FAIL=0
SAVED_FAIL=0
log() { echo "== $*" | tee -a "$OUT/log.txt"; }

adb wait-for-device
{ echo -n "release="; adb shell getprop ro.build.version.release; echo -n "sdk="; adb shell getprop ro.build.version.sdk; echo -n "model="; adb shell getprop ro.product.model; echo -n "abi="; adb shell getprop ro.product.cpu.abi; echo -n "size="; adb shell wm size; echo -n "density="; adb shell wm density; echo "font_scale=$FONT night=$NIGHT"; } | tr -d '\r' > "$OUT/device.txt"

# ---- clean install, and upgrade from the previous release only when it is the same app (same package id)
UPGRADE="NOT APPLICABLE: no previous release APK was available"
if [ -n "$PREV_APK" ] && [ -f "$PREV_APK" ]; then
  PREV_PKG=$( (aapt dump badging "$PREV_APK" 2>/dev/null || true) | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -1)
  if [ -z "$PREV_PKG" ]; then PREV_PKG=$( (aapt2 dump packagename "$PREV_APK" 2>/dev/null || true) | head -1); fi
  if [ "$PREV_PKG" = "$PKG" ]; then
    log "upgrade test: installing previous release then the new build over it"
    adb install -r "$PREV_APK" 2>&1 | tee -a "$OUT/log.txt"
    adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; sleep 6
    adb install -r "$APK" 2>&1 | tee -a "$OUT/log.txt"
    adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; sleep 6
    if [ -n "$(adb shell pidof $PKG | tr -d '\r')" ]; then UPGRADE="PASS: installed previous release (same package id), upgraded in place, app launched"; else UPGRADE="FAIL: app not running after upgrade"; FAIL=1; fi
    adb exec-out screencap -p > "$OUT/shots/00-after-upgrade.png"
    adb uninstall $PKG >/dev/null 2>&1
  else
    UPGRADE="NOT APPLICABLE: the previous release has package id '${PREV_PKG:-unknown}', not $PKG, so Android treats it as a different app (clean install only)"
  fi
fi
echo "$UPGRADE" > "$OUT/upgrade.txt"; log "$UPGRADE"

log "install"
adb install -r "$APK" 2>&1 | tee -a "$OUT/log.txt"
adb shell dumpsys package $PKG | grep -E "versionName|versionCode|requested permissions|android.permission|granted=|firstInstallTime" | tr -d '\r' > "$OUT/package.txt"
# The installed app must not request the internet (a design choice, see docs/OFFLINE_AND_INTERNET.md)
if adb shell dumpsys package $PKG | grep -q "android.permission.INTERNET"; then log "INTERNET permission is present: FAIL"; echo "INTERNET present" > "$OUT/internet-permission.txt"; FAIL=1; else echo "no INTERNET permission requested (dumpsys package)" > "$OUT/internet-permission.txt"; fi
adb shell dumpsys package $PKG | grep -A12 "intent-filter\|Action: \"android.intent.action.SEND\"" | tr -d '\r' | head -40 > "$OUT/share-filters.txt" || true
adb shell settings put system font_scale "$FONT"
adb shell cmd uimode night "$NIGHT"; if [ "$NIGHT" = "yes" ]; then adb shell settings put secure ui_night_mode 2; sleep 3; fi; { echo -n "settings ui_night_mode: "; adb shell settings get secure ui_night_mode; } | tr -d "\r" >> "$OUT/device.txt"; { echo -n "uimode night state after setting: "; adb shell cmd uimode night; } | tr -d "\r" >> "$OUT/device.txt"
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

run_flow() {
  local f=$1
  log "flow $f"
  local extra=""
  maestro test --help 2>&1 | grep -q -- "--test-output-dir" && extra="--test-output-dir $OUT/maestro/$(basename "$f" .yaml)"
  ( cd "$OUT/shots" && maestro test $extra --format junit --output "../junit/$(basename "$f" .yaml).xml" "$GITHUB_WORKSPACE/android-tests/flows/$f" ) 2>&1 | tail -40 | tee -a "$OUT/log.txt"
  local rc=${PIPESTATUS[0]}
  adb exec-out screencap -p > "$OUT/shots/end-of-$(basename "$f" .yaml).png" 2>/dev/null
  if [ "$rc" != "0" ]; then FAIL=1; log "FLOW FAILED: $f"; adb exec-out screencap -p > "$OUT/shots/FAILED-$(basename "$f" .yaml).png"; fi
  return $rc
}
# a flow whose failure is recorded but does not fail the job (environment-dependent steps)
run_flow_soft() { run_flow "$1" || { FAIL=$SAVED_FAIL; log "SOFT FAIL (recorded, not gating): $1"; echo "$1 failed" >> "$OUT/soft-failures.txt"; }; }

# whole-session screen recording of the main task (the recorder stops at 170 s per file)
adb shell "screenrecord --time-limit 170 /sdcard/main-task.mp4" &
REC=$!
sleep 2
run_flow 02-main-task-check-message.yaml
adb shell pkill -2 screenrecord; wait $REC 2>/dev/null; sleep 2
adb pull /sdcard/main-task.mp4 "$OUT/main-task.mp4" >/dev/null 2>&1 || log "no recording"

for f in 01-first-run.yaml 03-keyboard.yaml 04-back-navigation.yaml 07-settings-and-offline.yaml 08-share-by-text.yaml 14-theme-dark.yaml 15-encryption-check.yaml; do run_flow $f; done

# ---- offline: Wi-Fi and mobile data off, then the main task again
log "offline run"
adb shell svc wifi disable; adb shell svc data disable; sleep 3
adb shell dumpsys connectivity 2>/dev/null | grep -E "NetworkAgentInfo|state:" | head -5 > "$OUT/connectivity-offline.txt" || true
run_flow 13-offline-main-task.yaml
adb shell svc wifi enable; adb shell svc data enable

# ---- share-in: another app sends text to ScamCircle (an Android SEND intent, as the share sheet would send it)
log "share-in text (cold start)"
adb shell am force-stop $PKG; sleep 1
adb shell "am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'Hi Mum my phone broke, new number, can you send 300 pounds today. Share-in-test' -n $PKG/.MainActivity" 2>&1 | tee -a "$OUT/log.txt"
sleep 4
run_flow 09-share-in-text.yaml
log "share-in text (app already open)"
adb shell "am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT 'Second-share-test: your parcel is held, pay a fee now' -n $PKG/.MainActivity" 2>&1 | tee -a "$OUT/log.txt"
sleep 3
run_flow 10-share-in-while-open.yaml

log "share-in picture (environment-dependent, recorded but not gating)"
SAVED_FAIL=$FAIL
adb push "$GITHUB_WORKSPACE/apps/mobile/public/icon-512.png" /sdcard/Pictures/scamcircle-test.png >/dev/null 2>&1
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/scamcircle-test.png >/dev/null 2>&1
sleep 4
IMG_ID=$(adb shell content query --uri content://media/external/images/media --projection _id:_display_name 2>/dev/null | tr -d '\r' | grep "scamcircle-test" | head -1 | sed 's/.*_id=\([0-9]*\).*/\1/')
echo "image id: ${IMG_ID:-none}" | tee -a "$OUT/log.txt"
if [ -n "${IMG_ID:-}" ]; then
  adb shell am force-stop $PKG; sleep 1
  adb shell "am start -a android.intent.action.SEND -t image/png --eu android.intent.extra.STREAM content://media/external/images/media/$IMG_ID --grant-read-uri-permission -n $PKG/.MainActivity" 2>&1 | tee -a "$OUT/log.txt"
  sleep 5
  run_flow_soft 11-share-in-picture.yaml
else
  echo "no image could be put in the emulator media store: picture share-in NOT TESTED" | tee -a "$OUT/soft-failures.txt"
fi
FAIL=$SAVED_FAIL

# ---- process death: the unfinished message is written when the app goes to the background; the system then ends the process
run_flow 05-draft-write.yaml
sleep 2
adb shell am kill $PKG
sleep 1
adb shell pidof $PKG > "$OUT/pid-after-kill.txt" || echo "process gone" > "$OUT/pid-after-kill.txt"
run_flow 06-draft-restore.yaml

# ---- rotation and relaunch
log "rotation"
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 3
adb exec-out screencap -p > "$OUT/shots/20-landscape.png"
adb shell settings put system user_rotation 0
sleep 1

# ---- cold start time (release build), 5 runs
log "startup"
: > "$OUT/startup.txt"
for i in 1 2 3 4 5; do
  adb shell am force-stop $PKG; sleep 1
  adb shell am start -W -n "$(adb shell cmd package resolve-activity --brief $PKG | tail -1 | tr -d '\r')" | grep -E "TotalTime|WaitTime" | tr -d '\r' | tr '\n' ' ' >> "$OUT/startup.txt"; echo >> "$OUT/startup.txt"
  sleep 2
done

# ---- memory and scrolling on a result screen
log "memory and scroll"
run_flow 12-measure-setup.yaml
adb shell dumpsys gfxinfo $PKG reset >/dev/null
for i in 1 2 3 4 5 6; do adb shell input swipe 540 1700 540 500 250; adb shell input swipe 540 500 540 1700 250; done
adb shell dumpsys gfxinfo $PKG | grep -E "Total frames rendered|Janky frames|50th|90th|95th|99th" | tr -d '\r' > "$OUT/scroll-gfxinfo.txt"
adb shell dumpsys meminfo $PKG | grep -E "TOTAL PSS|TOTAL:|Java Heap|Native Heap" | tr -d '\r' | head -5 > "$OUT/meminfo.txt"

adb logcat -d -t 3000 | grep -E "ReactNative|AndroidRuntime|FATAL|$PKG" | tail -200 > "$OUT/logcat-excerpt.txt"
log "done fail=$FAIL"
exit $FAIL
