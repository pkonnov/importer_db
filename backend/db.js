import {createConnection} from 'mysql2/promise'

export async function getConnection(connection_data) {

    return createConnection({
        ...connection_data
    });
}