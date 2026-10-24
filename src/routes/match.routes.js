const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.post('/', matchController.matchResumeWithJob);
router.get('/', matchController.getMyMatches);
router.get('/:id', matchController.getMatchById);
router.delete('/:id', matchController.deleteMatch);

module.exports = router;

