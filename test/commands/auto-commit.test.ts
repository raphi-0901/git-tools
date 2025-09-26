import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('auto-commit', () => {
  it('runs auto-commit cmd', async () => {
    const {stdout} = await runCommand('auto-commit')
    expect(stdout).to.contain('hello world')
  })

  it('runs auto-commit --name oclif', async () => {
    const {stdout} = await runCommand('auto-commit --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
