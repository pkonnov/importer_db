import crypto from "crypto";
import ImportState from "./modules/syncDb.js";
import {errors} from "./errors/index.js";

const getHash = (data) => {
   let signature = crypto.createHash("md5")
   signature.update(`${data.fromDb.database}`)
   signature.update(`${data.fromDb.user}`)
   signature.update(`${data.fromDb.port}`)
   signature.update(`${data.fromDb.host}`)
   signature.update(`${data.fromDb.password}`)
   return signature.digest("hex")
}

export const runSyncHandler = async (req, res) => {
   req.on('data', async (chunk) => {
      try {
         const data = JSON.parse(chunk)
         const hash = getHash(data)
         const initImportState = new ImportState(data.fromDb, data.toDb, hash)
         const result = await initImportState.runSync()
         await res.writeHead(200, {"Content-Type": "application/json"})
         await res.end(JSON.stringify({
            status: result
         }))
      } catch (err) {
         let status = 500
         let metadata = null
         const code = err.message
         switch (code) {
            case errors.ImportDatabaseEmpty:
               status = 409
               break
            default:
               break
         }
         res.writeHead(status, {"Content-Type": "application/json"})
         res.end(JSON.stringify({
            status: "error",
            code: code,
            metadata
         }))
      }
   })
}
