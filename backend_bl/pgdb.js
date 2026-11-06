const Pool = require('pg').Pool
const pool = new Pool({
    connectionString: process.env.BACKEND_DBConnLink
})

module.exports = pool