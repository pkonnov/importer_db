
class Stages {
    RUN_CREATE_TABLES = "run_create_tables"
    CREATE_TABLES_ERROR = "create_tables_error"
    RUN_CREATE_ROWS = "run_create_rows"
    CREATE_ROWS_ERROR = "create_rows_error"
    FINISH = "finish"
    ERROR = "error"
}


export const stages = new Stages()