const express = require('express');
let {param, check} = require('express-validator');
const scrapeController = require('../controllers/scrapeController');
const projectSummaryController = require('../controllers/projectSummaryController');
const router = express.Router();

//**validation required */
router.post('/register-snapshot', [
        check('snapshot_date').not().isEmpty(),
        check('snapshot_url').not().isEmpty()
    ]
,scrapeController.scrape);
router.get('/snapshot-dates/:id',projectSummaryController.snapshotDates);
router.get('/project-summary', projectSummaryController.projectSummary);
router.get('/task-details', projectSummaryController.taskDetails);
router.get('/contributor-data', projectSummaryController.contributorDetail);
router.get('/performance', projectSummaryController.performanceMetrics);
router.post('/add-note', projectSummaryController.addNote);
router.get('/get-notes/:id', projectSummaryController.getNote);
router.get('/latest-project-summary', projectSummaryController.loadLatestProjectSummary);
router.delete('/snapshot', projectSummaryController.deleteSnapshot);


//**NO validation required */
router.get('/all-projects', projectSummaryController.allProjects);
router.get('/task-contributors', projectSummaryController.taskContributors);

//** Test Routes */
router.get('/progress/durationBased', projectSummaryController.progressBasedDuration);
router.get('/progress/effortBased', projectSummaryController.progressBasedEffort);

module.exports = router;