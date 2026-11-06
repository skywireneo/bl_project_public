const Router = require('express')
const router = new Router()
const { body } = require('express-validator')
const userController = require('../../controllers/userController')
const authMiddleware = require('../../middleware/authMiddleware')

const checkRole = require('../../middleware/roleMiddleware')


router.post('/createUser', authMiddleware, checkRole(["DEVELOPER", "TOP_LEVEL_DEVELOPER"]), userController.createUser)

module.exports = router