const Pool = require('pg').Pool
const pool = new Pool({
    connectionString: process.env.FILES_CONTROL_DBConnLink
})

module.exports = pool