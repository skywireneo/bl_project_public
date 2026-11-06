const Router = require('express')
const router = new Router()
const userRouter = require('./userAdmRoutes')

router.use('/user', userRouter)

module.exports = router