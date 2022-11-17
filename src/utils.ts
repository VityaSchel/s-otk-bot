import SOTKAPI, { SOTKOperationError } from 's-otk-js'
import fs from 'fs/promises'

export type SOTKAPIExtended = SOTKAPI & { fetch: refetchUtil, _fetch: SOTKAPI['fetch'] }

export function addRefetchUtil(SOTK: SOTKAPIExtended, sessionJSONPath) {
  const refetchUtil: refetchUtil = async function(this: SOTKAPIExtended, ...args: Parameters<SOTKAPI['fetch']>): ReturnType<SOTKAPI['fetch']> {

    const sessionJSON = await fs.readFile(sessionJSONPath, 'utf-8')
    let session = {}
    try { session = JSON.parse(sessionJSON) } catch(e) { /**/ }
    SOTK.credentials = session

    try {
      return await this._fetch(...args)
    } catch(e) {
      if(e instanceof SOTKOperationError) {
        if(e.code === 'NOT_LOGGED_IN') {
          // TODO: May cause infinite loop, refactor!
          const sessionData = await SOTK.login({ 
            username: process.env.SOTK_USERNAME as string,
            password: process.env.SOTK_PASSWORD as string
          })
          const session = {
            authToken: sessionData.authToken,
            csrfToken: sessionData.csrfToken,
            token: sessionData.sessionToken,
          }
          await fs.writeFile(sessionJSON, JSON.stringify(session), 'utf-8')
          SOTK.credentials = session
          return await this._fetch(...args)
        } else {
          throw e
        }
      } else {
        throw e
      }
    }
  }
  SOTK._fetch = SOTK.fetch
  SOTK.fetch = refetchUtil
}

export type refetchUtil = (this: SOTKAPIExtended, ...args: Parameters<SOTKAPI['fetch']>) => ReturnType<SOTKAPI['fetch']>