import mongoose from "mongoose";

const uri = 'mongodb://127.0.0.1/storage_stages';
mongoose.connect(uri).catch(err => console.log(err))

const Schema = mongoose.Schema;

const StagesImportSchema = new Schema({
    status: {
        type: String,
        enum: ['run_create_tables', 'tables_created', 'run_create_rows', 'finished', 'error'],
        default: 'run_create_tables'
    },
    hash: String,
    tablesSuchNeedCreated: Array,
    createdTables: Array,
    lastSuccessRow: String,
    errorTables: Array,
    errorRow: Array,
    lastError: String,
});

StagesImportSchema.methods.nextStatus = function nextStatus(status) {
    this.status = status
    this.save()
}

export const StagesImport = mongoose.model('StagesImport', StagesImportSchema );