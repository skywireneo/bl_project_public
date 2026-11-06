const Router = require('express')
const router = new Router()
const unifiedFileRouter = require('./unifiedFileRouter')
const antivirusRouter = require('./antivirusRouter')

router.use('/files', unifiedFileRouter)
router.use('/av', antivirusRouter)
router.get('/test', (req, res) => {
    res.send('Hello World APP_F!');
});

module.exports = router