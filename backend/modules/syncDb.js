import {getConnection} from "../db.js"
import {errors, ConflictError} from "../errors/index.js"
import {SetOperation} from "../utils.js";
import {StagesImport} from "../storage/schemas.js"
import {stages} from "../constants.js";


class ImportState {
    connFromDb = null
    connToDb = null

    constructor(fromDb, toDb, hash, runWithLastError) {
        this.fromDb = fromDb
        this.toDb = toDb
        this.hash = hash
        this.runWithLastError = runWithLastError
        this.stage = null
        this.stages = {
           ...stages
        }
        this.stages[stages.RUN_CREATE_TABLES] = this.createTables
        this.stages[stages.RUN_CREATE_ROWS] = this.createRows
    }

    async createConnFrom() {
        try {
            this.connFromDb = await getConnection(this.fromDb)
        } catch (err) {
            console.log(err);
        }
    }

    async createConnTo() {
        try {
            this.connToDb = await getConnection(this.toDb)
        } catch (err) {
            console.log(err);
        }
    }

    async runSync() {
        await this.createConnFrom()
        await this.createConnTo()
        try {
            let stage = null
            if (this.runWithLastError) {
                stage = await StagesImport.find({hash: this.hash, status: stages.ERROR}).sort({"createdAt": 1}).exec()
                stage = stage[0]
            }

            if (!stage) {
                const doc = new StagesImport({hash: this.hash})
                await doc.save()
                this.stage = doc
            } else {
                this.stage = stage
            }

            // if (!this.stage)
                // throw

            const listTablesFromDb = await this.getListTables(this.connFromDb, this.fromDb.database)
            const listTablesToDb = await this.getListTables(this.connToDb, this.toDb.database)

            if (!stage) {
                if (!listTablesFromDb.length) {
                    // throw new ConflictError(errors.ExportDatabaseEmpty)
                }

                if (!listTablesToDb.length) {
                    // throw new ConflictError(errors.ImportDatabaseEmpty)
                }

                const tablesDescribeFromDb = await this.getTablesDescribe(listTablesFromDb, this.connFromDb)
                const tablesDescribeToDb = await this.getTablesDescribe(listTablesToDb, this.connToDb)
                const diff = await this.getDiffTables(tablesDescribeFromDb, tablesDescribeToDb)

                if (diff) {
                    // throw new ConflictError(errors.ExcellentTableStruct)
                }
            }
            // not work
            await this.createTables(listTablesFromDb, listTablesToDb)
            await this.createRows()
        } catch (err) {
            console.log(err)
        }
    }

    async createTables(listTablesFromDb, listTablesToDb) {
        let tablesSuchNeedCreate = null
        if (!this.runWithLastError) {
            tablesSuchNeedCreate = SetOperation.difference(listTablesFromDb, listTablesToDb)
            this.stage.tablesSuchNeedCreated.push(...tablesSuchNeedCreate)
        }
        console.log(`start create tables: ${tablesSuchNeedCreate}`)
        if (tablesSuchNeedCreate || this.stage.tablesSuchNeedCreated) {
            const statements = await this.getTableStatements(
                tablesSuchNeedCreate || this.stage.tablesSuchNeedCreated, this.connFromDb)
            statements.forEach((value, key, map) => {
                this.connToDb.query(value).then(async (res) => {
                    this.stage.createdTables.push(key)
                    this.stage.tablesSuchNeedCreated.shift()
                    await this.saveStage()
                }).catch(async err => {
                    this.stage.errorTables.push(key)
                    this.stage.lastError = err
                    this.stage.status = stages.CREATE_TABLES_ERROR
                    await this.saveStage()
                })
            })
        }
        await this.runStage(stages.RUN_CREATE_ROWS)
    }

    async getTableStatements(listTableNames, conn) {
        const key = "Create Table"
        const statements = new Map()
        for (const name of listTableNames) {
            const res = await conn.query(`show create table ${name};`)
            statements.set(name, res[0][0][key])
        }
        return statements
    }

    async getTablesDescribe(listTableNames, conn) {
        const describes = new Map()
        for (const name of listTableNames) {
            const res = await conn.query(`describe ${name}`)
            describes.set(name, res[0])
        }
        return describes
    }

    async getListTables(conn, nameDb) {
        const keyDb = `Tables_in_${nameDb}`
        return (await conn.query(`show tables;`))[0].map(item => item[keyDb])
    }

    async getDiffTables(tablesDescribeFrom, tablesDescribeTo) {
        const diffTables = new Map()
        tablesDescribeFrom.forEach((value, key, map) => {
            const tableToDb = tablesDescribeTo.get(key)
            if (tableToDb) {
                const tableFromDb = map.get(key)
                const diff = SetOperation.differenceObj(tableToDb, tableFromDb)
                diffTables.set(key, diff)
            }
        })
        return diffTables
    }

    async createRows() {
        await this.stage.nextStatus(stages.RUN_CREATE_ROWS)
        console.log('run create rows')
        for (const table of this.stage.createdTables) {
            console.log(`run create rows to ${table}`)
            const qCountRows = await this.connFromDb.query(`select count(*) from ${table};`)
            const countRows = qCountRows[0][0]["count(*)"]
            const lastSuccessRow = this.stage.lastSuccessRow
            for (let j = lastSuccessRow ? lastSuccessRow: 0; j < countRows; j += 1000) {
                try {
                    const resRows = await this.connFromDb.query(`select * from ${table} limit 1000 offset ${j}`)
                    const rows = resRows[0]
                    await this.connToDb.beginTransaction()
                    const queries = []
                    rows.forEach((value) => {
                        queries.push(this.connToDb.query(this.getInsertQuery(table, value)))
                    })
                    await Promise.all(queries)
                    await this.connToDb.commit()
                    const lenRows = rows.length
                    console.log(`created count rows ${lenRows}`)
                    if (lenRows < 1000) {
                        this.stage.lastSuccessRow = 0
                        this.stage.status = stages.FINISH
                        this.stage.createdTables.shift()
                        await this.saveStage()
                        console.log(`created rows end`)
                    }
                } catch (err) {
                    console.log(err)
                    await this.connToDb.rollback()
                    await this.connToDb.end()
                    this.stage.lastError = err
                    this.stage.errorTables.push(table)
                    this.stage.status = stages.ERROR
                    this.stage.lastSuccessRow = j - 1000
                }
            }
        }
        await this.connToDb.end()
    }

    async saveStage() {
        await StagesImport.updateOne({hash: this.stage.hash, created_at: this.stage.created_at}, this.stage).exec()
    }

    getInsertQuery(table, val) {
        const q =
            `insert into ${table} (${Object.keys(val)}) values (${Object.values(val).map(v => this.getValue(v))});`
        return q
    }

    getValue(value) {
        if (typeof value == "string")
            return `"${value}"`
        if (value == null)
            return 'NULL'
        return value
    }
}

export default ImportState;
