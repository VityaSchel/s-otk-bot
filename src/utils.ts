import SOTKAPI, { SOTKOperationError } from 's-otk-js'
import fs from 'fs/promises'

export type SOTKAPIExtended = SOTKAPI & { runJSONOperation: refetchUtil, _runJSONOperation: SOTKAPI['runJSONOperation'] }

export function addRefetchUtil(SOTK: SOTKAPIExtended, sessionJSONPath, credentials: { username: string, password: string }) {
  const refetchUtil: refetchUtil = async function(this: SOTKAPIExtended, ...args: Parameters<SOTKAPI['runJSONOperation']>): ReturnType<SOTKAPI['runJSONOperation']> {
    const sessionJSON = await fs.readFile(sessionJSONPath, 'utf-8')
    let session = {}
    try { session = JSON.parse(sessionJSON) } catch(e) { /**/ }
    this.credentials = session

    try {
      return await this._runJSONOperation(...args)
    } catch(e) {
      console.error('Error while running operation', e)
      if(e instanceof SOTKOperationError) {
        console.error(e.code)
        if(e.code === 'NOT_LOGGED_IN') {
          console.error('Relogged in...')
          const sessionData = await this.login({ 
            username: credentials.username,
            password: credentials.password
          })
          const session = {
            authToken: sessionData.authToken,
            csrfToken: sessionData.csrfToken,
            token: sessionData.sessionToken,
          }
          await fs.writeFile(sessionJSONPath, JSON.stringify(session), 'utf-8')
          this.credentials = session
          await this.getAccountInfo(false)
          return await this._runJSONOperation(...args)
        } else {
          throw e
        }
      } else {
        throw e
      }
    }
  }
  SOTK._runJSONOperation = SOTK.runJSONOperation
  SOTK.runJSONOperation = refetchUtil
}

export type refetchUtil = (this: SOTKAPIExtended, ...args: Parameters<SOTKAPI['runJSONOperation']>) => ReturnType<SOTKAPI['runJSONOperation']>