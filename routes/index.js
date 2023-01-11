const express = require('express');
let {param, check} = require('express-validator');
const scrapeController = require('../controllers/scrapeController');
const projectSummaryController = require('../controllers/projectSummaryController');
const checksController = require('../controllers/checksController');
const criticalPathController = require('../controllers/CriticalPath/criticalPathController');
const updateCriticalPath = require('../controllers/CriticalPath/criticalPath');
const router = express.Router();

//**validation required */
router.post('/register-snapshot', [
        check('snapshot_date').not().isEmpty(),
        check('snapshot_url').not().isEmpty()
    ]
,scrapeController.scrape);
router.get('/snapshot-dates/:id',projectSummaryController.snapshotDates);
router.get('/compare-to-dates',projectSummaryController.getCompareTodate);
router.get('/project-summary', projectSummaryController.projectSummary);
router.get('/task-details', projectSummaryController.taskDetails);
router.get('/contributor-data', projectSummaryController.contributorDetail);
router.get('/performance', projectSummaryController.timelinessTaskDetails);
router.post('/add-note', projectSummaryController.addNote);
router.get('/get-notes/:id', projectSummaryController.getNote);
router.get('/latest-project-summary', projectSummaryController.loadLatestProjectSummary);
router.delete('/snapshot', projectSummaryController.deleteSnapshot);
router.post('/buffer', projectSummaryController.addBuffer);
router.delete('/note', projectSummaryController.deleteNote);
router.get('/criticalPath', criticalPathController.criticalPath);
router.post('/check-snapshot', [
    check('snapshot_date').not().isEmpty(),
    check('snapshot_url').not().isEmpty()
]
, checksController.check_Errors_Warnings);

//**NO validation required */
router.get('/all-projects', projectSummaryController.allProjects);
router.get('/task-contributors', projectSummaryController.taskContributors);

//** Test Routes */
router.get('/progress/durationBased', projectSummaryController.progressBasedDuration);
router.get('/progress/effortBased', projectSummaryController.progressBasedEffort);
router.post('/criticalPath', updateCriticalPath.updateCriticalPath);




module.exports = router;