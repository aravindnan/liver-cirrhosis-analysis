import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Guards against a problem that already cost a failed deploy. `import { Close } from '@mui/icons-material'`
// makes the bundler resolve all 10,612 icon modules to use a handful. That alone took a production build
// from about 350 MB to 1.6-2 GB, far above the 512 MB Render gives free builds, so the build was killed.
// Import each icon from its own module instead: `import Close from '@mui/icons-material/Close'`.
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx?|jsx?)$/.test(path) ? [path] : []
  })

test('no file imports MUI icons or components from the package root', () => {
  const barrel = /from\s+['"]@mui\/(icons-material|material)['"]/
  // This file is skipped: its comment above quotes the pattern it looks for.
  const offenders = sourceFiles(join(process.cwd(), 'src'))
    .filter((file) => !file.endsWith('buildGuards.test.ts'))
    .filter((file) => barrel.test(readFileSync(file, 'utf8')))
  expect(offenders).toEqual([])
})
