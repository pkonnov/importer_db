import {getConnection} from "../db.js"
import {errors, ConflictError} from "../errors/index.js"
import {SetOperation} from "../utils.js";
import {StagesImport} from "../storage/schemas.js"


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
                this.stage = stage._doc
            }

            // if (!this.stage)
                // throw

            await this.createTables()
        } catch (err) {
            console.log(err)
        }
    }

    async createTables() {
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

        const tablesSuchNeedCreate = SetOperation.difference(listTablesFromDb, listTablesToDb)
        if (tablesSuchNeedCreate) {
            const statements = await this.getTableStatements(tablesSuchNeedCreate, this.connFromDb)
            for await (const statement of statements)
                await this.connToDb.query(statement)
        }
    }

    async getTableStatements(listTableNames, conn) {
        const key = "Create Table"
        const statements = []
        for (const name of listTableNames) {
            const res = await conn.query(`show create table ${name};`)
            statements.push(res[0][0][key])
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

}

export default ImportState;
