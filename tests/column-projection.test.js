const assert = require('assert')
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const sourcePath = path.join(
  __dirname,
  '..',
  'src',
  'renderer',
  'src',
  'components',
  'Cell',
  'columnProjection.ts'
)

const source = fs.readFileSync(sourcePath, 'utf8')
const { code } = esbuild.transformSync(source, {
  loader: 'ts',
  format: 'cjs',
  target: 'es2020'
})

const moduleUnderTest = { exports: {} }
const runModule = new Function('exports', 'module', code)
runModule(moduleUnderTest.exports, moduleUnderTest)

const {
  collectArrayLeafColumns,
  getValueByRelativePath,
  beginColumnProjectionSelection,
  setDraftColumnSelected,
  setDraftColumnQuery,
  applyDraftColumnProjection,
  clearColumnProjection,
  getAppliedProjectionColumns,
  hasActiveColumnProjection,
  getProjectionContextForPath,
  isProjectedPathVisible,
  applyColumnProjectionsToData
} = moduleUnderTest.exports

const statuses = [
  {
    release: null,
    unitStatus: {
      jobNumber: -1,
      startTime: '2026-06-03T10:34:48+09:00',
      retCode: 0
    },
    definition: {
      unitType: 'ROOTNET',
      unitID: 18098,
      unitName: '/GROUP4/CycleBatch/AXIODEV2_CJ'
    }
  },
  {
    unitStatus: {
      jobNumber: 9578,
      startTime: '2026-06-03T10:34:48+09:00',
      status: 'normal'
    },
    definition: {
      unitType: 'JOB',
      unitID: 18099,
      unitName: '/GROUP4/CycleBatch/AXIODEV2_CJ/J-CY1220'
    }
  }
]

const columns = collectArrayLeafColumns(statuses)
assert.deepStrictEqual(
  columns.map((column) => column.path),
  [
    'release',
    'unitStatus.jobNumber',
    'unitStatus.startTime',
    'unitStatus.retCode',
    'definition.unitType',
    'definition.unitID',
    'definition.unitName',
    'unitStatus.status'
  ]
)
assert.deepStrictEqual(
  columns.map((column) => column.label).slice(1, 3),
  ['jobNumber', 'startTime']
)

assert.strictEqual(getValueByRelativePath(statuses[0], 'unitStatus.jobNumber'), -1)
assert.strictEqual(getValueByRelativePath(statuses[0], 'definition.unitName'), '/GROUP4/CycleBatch/AXIODEV2_CJ')
assert.strictEqual(getValueByRelativePath(statuses[0], 'definition.missing'), undefined)

let state = {}
state = beginColumnProjectionSelection(state, '.statuses', columns)
assert.strictEqual(state['.statuses'].isSelecting, true)
assert.strictEqual(state['.statuses'].draftColumnPaths.length, columns.length)

state = setDraftColumnSelected(state, '.statuses', 'unitStatus.retCode', false)
state = setDraftColumnSelected(state, '.statuses', 'unitStatus.status', false)
state = setDraftColumnQuery(state, '.statuses', 'unit')
assert.strictEqual(state['.statuses'].draftQuery, 'unit')

state = applyDraftColumnProjection(state, '.statuses', columns)
assert.strictEqual(hasActiveColumnProjection(state, '.statuses'), true)
assert.deepStrictEqual(
  getAppliedProjectionColumns(state, '.statuses').map((column) => column.path),
  [
    'release',
    'unitStatus.jobNumber',
    'unitStatus.startTime',
    'definition.unitType',
    'definition.unitID',
    'definition.unitName'
  ]
)

assert.deepStrictEqual(getProjectionContextForPath('.statuses[0].unitStatus.jobNumber'), {
  arrayPath: '.statuses',
  itemPath: '.statuses[0]',
  relativePath: 'unitStatus.jobNumber'
})
assert.deepStrictEqual(getProjectionContextForPath('[3].definition.unitID'), {
  arrayPath: '',
  itemPath: '[3]',
  relativePath: 'definition.unitID'
})
assert.strictEqual(getProjectionContextForPath('.metadata.count'), null)

assert.strictEqual(isProjectedPathVisible(state, '.statuses[0].unitStatus.jobNumber'), true)
assert.strictEqual(isProjectedPathVisible(state, '.statuses[0].unitStatus.retCode'), false)
assert.strictEqual(isProjectedPathVisible(state, '.metadata.count'), true)

const copiedColumns = [
  'unitStatus.srcExecID',
  'unitStatus.schStartTime',
  'unitStatus.registerTime',
  'unitStatus.jobNumber',
  'unitStatus.executionType',
  'unitStatus.endTime',
  'unitStatus.status',
  'unitStatus.execID',
  'unitStatus.startTime',
  'definition.execFileName',
  'definition.unitType',
  'definition.simpleUnitName'
].map((columnPath) => ({
  path: columnPath,
  label: columnPath.split('.').pop(),
  groupPath: columnPath.split('.').slice(0, -1).join('.')
}))

const copied = applyColumnProjectionsToData(
  {
    all: true,
    statuses: [
      {
        unitStatus: {
          srcExecID: 'src-1',
          schStartTime: '2026-06-03T10:00:00+09:00',
          registerTime: '2026-06-03T10:01:00+09:00',
          jobNumber: 9578,
          executionType: 'schedule',
          endTime: '2026-06-03T10:35:00+09:00',
          status: 'normal',
          execID: 'exec-1',
          startTime: '2026-06-03T10:34:48+09:00',
          ignored: 'hidden'
        },
        definition: {
          execFileName: 'AXIODEV2_CJ.bat',
          unitType: 'JOB',
          simpleUnitName: 'AXIODEV2_CJ',
          ignored: 'hidden'
        },
        release: null
      }
    ]
  },
  {
    '.statuses': {
      isSelecting: false,
      appliedColumns: copiedColumns,
      draftColumnPaths: copiedColumns.map((column) => column.path),
      draftQuery: ''
    }
  }
)

assert.deepStrictEqual(copied, {
  all: true,
  statuses: [
    {
      unitStatus: {
        srcExecID: 'src-1',
        schStartTime: '2026-06-03T10:00:00+09:00',
        registerTime: '2026-06-03T10:01:00+09:00',
        jobNumber: 9578,
        executionType: 'schedule',
        endTime: '2026-06-03T10:35:00+09:00',
        status: 'normal',
        execID: 'exec-1',
        startTime: '2026-06-03T10:34:48+09:00'
      },
      definition: {
        execFileName: 'AXIODEV2_CJ.bat',
        unitType: 'JOB',
        simpleUnitName: 'AXIODEV2_CJ'
      }
    }
  ]
})

state = clearColumnProjection(state, '.statuses')
assert.strictEqual(hasActiveColumnProjection(state, '.statuses'), false)

console.log('column projection tests passed')
