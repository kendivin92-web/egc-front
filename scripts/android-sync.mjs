import { spawnSync } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apkPath = resolve(root, 'public', 'app-egc.apk')
const backupPath = resolve(root, '.app-egc.apk.android-build-backup')
const isWindows = process.platform === 'win32'

function run(command, args, cwd = root) {
  const result = spawnSync(
    isWindows ? process.env.ComSpec || 'cmd.exe' : command,
    isWindows ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args,
    {
      cwd,
      shell: false,
      stdio: 'inherit',
    },
  )

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? 'unknown'}`)
  }
}

let apkMoved = false

try {
  if (existsSync(backupPath)) {
    throw new Error(`Android build backup already exists: ${backupPath}`)
  }

  if (existsSync(apkPath)) {
    renameSync(apkPath, backupPath)
    apkMoved = true
  }

  run(isWindows ? 'npm.cmd' : 'npm', ['run', 'build'])
  run(isWindows ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'])
  run(isWindows ? 'gradlew.bat' : './gradlew', [':app:assembleDebug'], resolve(root, 'android'))
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  if (apkMoved) {
    try {
      renameSync(backupPath, apkPath)
    } catch (error) {
      console.error(`Failed to restore downloadable APK from ${backupPath}`, error)
      process.exitCode = 1
    }
  }
}
