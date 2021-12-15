import http from 'http'
import {runSyncHandler} from './methods.js'

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if ( req.method === 'OPTIONS' ) {
        res.writeHead(200);
        res.end();
    }
})

server.on('request', async (req, res) => {
    switch(req.url) {
        case "/mysql/run-sync":
            await runSyncHandler(req, res)
            break
        default:
            break
    }
})

server.listen(8000)