
class Errors {
   ImportDatabaseEmpty = 'import_database_empty';
   ExportDatabaseEmpty = 'export_database_empty';
}

class CustomError extends Error {
   constructor(message, code, metadata) {
      super(message);
      this.code = code;
      this.metadata = metadata
   }
}

export class ConflictError extends CustomError {
   constructor(message, code, metadata) {
      super(message, code, metadata);
   }
}

export const errors = new Errors()