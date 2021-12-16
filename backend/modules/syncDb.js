import {getConnection} from "../db.js"
import {errors, ConflictError} from "../errors/index.js"
import {SetOperation} from "../utils.js";
import {StagesImport} from "../storage/schemas.js"
import {stages} from "../constants.js";


class ImportState {
    connFromDb = null
    connToDb = null

    constructor(fromDb, toDb, hash) {
        this.fromDb = fromDb
        this.toDb = toDb
        this.hash = hash
        this.stage = null
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
            const stage = await StagesImport.findOne({hash: this.hash}).exec()

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
            if (!listTablesFromDb.length) {
                // throw new ConflictError(errors.ExportDatabaseEmpty)
            }

            const listTablesToDb = await this.getListTables(this.connToDb, this.toDb.database)
            if (!listTablesToDb.length) {
                // throw new ConflictError(errors.ImportDatabaseEmpty)
            }

            const tablesDescribeFromDb = await this.getTablesDescribe(listTablesFromDb, this.connFromDb)
            const tablesDescribeToDb = await this.getTablesDescribe(listTablesToDb, this.connToDb)
            const diff = await this.getDiffTables(tablesDescribeFromDb, tablesDescribeToDb)

            if (diff) {
                // throw new ConflictError(errors.ExcellentTableStruct)
            }

            await this.createTables(listTablesFromDb, listTablesToDb)
            await this.createRows()

        } catch (err) {
            console.log(err)
        }
    }

    async createTables(listTablesFromDb, listTablesToDb) {
        const tablesSuchNeedCreate = SetOperation.difference(listTablesFromDb, listTablesToDb)
        this.stage.tablesSuchNeedCreated.push(...tablesSuchNeedCreate)

        console.log(`start create tables: ${tablesSuchNeedCreate}`)
        if (tablesSuchNeedCreate) {
            const statements = await this.getTableStatements(tablesSuchNeedCreate, this.connFromDb)
            statements.forEach((value, key, map) => {
                this.connToDb.query(value).then(async (res) => {
                    this.stage.createdTables.push(key)
                    await this.saveStage()
                }).catch(async err => {
                    this.stage.errorTables.push(key)
                    this.stage.lastError = err
                    await this.saveStage()
                })
            })
        }
        this.stage.nextStatus(stages.TABLES_CREATED)
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
        this.stage.nextStatus(stages.RUN_CREATE_ROWS)
        const tables = this.stage.tablesSuchNeedCreated
        for (let i = 0; i < tables.length; i++) {
            const qCountRows = await this.connFromDb.query(`select count(*) from ${tables[i]};`)
            const countRows = qCountRows[0][0]["count(*)"]
            for (let j = 0; j < countRows; j += 1000) {
                try {
                    await this.connFromDb.beginTransaction()
                    const queries = []
                    const res_rows = await this.connFromDb.query(`select * from ${tables[i]} limit 1000 offset ${j}`)
                    const rows = res_rows[0]
                    rows.forEach((value) => {
                        queries.push(this.connToDb.query(this.getInsertQuery(tables[i], value)))
                    })
                    await Promise.all(queries)
                    await this.connFromDb.commit()
                    const lenRows = rows.length
                    if (lenRows < 1000) {
                        await this.connFromDb.end()
                        this.stage.nextStatus(stages.FINISH)
                        break
                    }
                } catch (err) {
                    await this.connFromDb.rollback()
                    await this.connFromDb.end()
                    this.stage.nextStatus(stages.ERROR)
                }
            }
        }
    }

    async saveStage() {
        await StagesImport.updateOne({hash: this.stage.hash}, this.stage).exec()
    }

    getInsertQuery(table, val) {
        const q =
            `insert into ${table} (${Object.keys(val)}) values (${Object.values(val).map(v => typeof v == "string" ? `"${v}"` : v)});\n`
        return q
    }
}

export default ImportState;
