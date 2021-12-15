import mongoose from "mongoose";

const uri = 'mongodb://127.0.0.1/storage_stages';
mongoose.connect(uri).catch(err => console.log(err))

const Schema = mongoose.Schema;

const StagesImportSchema = new Schema({
    status: {
        type: String,
        enum: ['run_create_tables', 'finished_create_tables', 'run_create_rows', 'finished_create_rows'],
        default: 'run_create_tables'
    },
    hash: String,
    createdTables: Array,
    errorTables: Array,
    errorRow: Array
});

export const StagesImport = mongoose.model('StagesImport', StagesImportSchema );