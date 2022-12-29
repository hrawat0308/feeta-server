const fs = require("fs");
const axios = require("axios")
const express = require('express');
let mysql = require('../Utils/dbConnection');

let { validationResult } = require('express-validator');

const scrape = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "snapshot date or snapshot url is not provided!!"
        });
    }
    
    await instaganttApi(req, res, next);
    
}

const instaganttApi = async (req, res, next) => {
    let { snapshot_date, snapshot_url } = req.body;
    let tempConnection;
    let project_name;
    let project_id;
    const val = [];
    const dpdmap = new Map();
    let dpdarr = [];
    let userAssignee = [];
    try{
        const response = await axios.get(snapshot_url+`.json`);
        //** Establish MySQL connection */
        tempConnection = await mysql.connection();
        if(response){
            let snapshot = await response.data;
            const {tasks, project} = snapshot;
            project_name = project.name;
            project_id = project.id;
            
            //project details to store in project master
            projectDetails = [project_id, project_name, snapshot_url, snapshot_date];

            //creating assginee and user assignee array
            for(let i = 0; i < tasks.length; i++){
                let assignee = [];
                for(let j = 0; j < tasks[i].users.length; j++){
                    if(tasks[i].users[j] == null){
                        assignee.push(null);
                    }
                    else{
                        assignee.push(tasks[i].users[j].user_id);
                        userAssignee.push([tasks[i].users[j].user_id, tasks[i].users[j].name, tasks[i].users[j].email, tasks[i].project_id]);
                    }
                }

                const assignees = JSON.stringify(assignee);
                let workType = "work";
                if (isEmpty(tasks[i].custom_fields) || tasks[i].custom_fields["7m4cTikwf0A9Cjsa4nEX"] == undefined) {
                    workType = "work";
                }
                else if (tasks[i].custom_fields["7m4cTikwf0A9Cjsa4nEX"] == 4) {
                    workType = "rework"
                }
                else if (tasks[i].custom_fields["7m4cTikwf0A9Cjsa4nEX"] == 5) {
                    workType = "learn"
                }
                else if (tasks[i].custom_fields["7m4cTikwf0A9Cjsa4nEX"] == 6) {
                    workType = "external"
                }
                else if (tasks[i].custom_fields["7m4cTikwf0A9Cjsa4nEX"] == 7) {
                    workType = "spec change"
                }
                else if (tasks[i].custom_fields["7m4cTikwf0A9Cjsa4nEX"] == 2) {
                    workType = "work"
                }

                let on_cp;
                if (tasks[i].custom_fields["nhPHaq7UMPYo5v50L4LE"] == undefined) {
                    on_cp = true;
                }
                else if (tasks[i].custom_fields["nhPHaq7UMPYo5v50L4LE"] == 2) {
                    on_cp = false;
                }
                // ** maybe required later not to delete */
                else if (tasks[i].custom_fields["nhPHaq7UMPYo5v50L4LE"] == 1) {
                    on_cp = true;
                }

                val.push([tasks[i].id
                    , project_id
                    , tasks[i].name
                    , tasks[i].subtasks == 0 ? false : true
                    , tasks[i].is_milestone
                    , tasks[i].parent.id ? tasks[i].parent.id : ""
                    , tasks[i].estimated_hours == "" ? 0 : tasks[i].estimated_hours
                    , tasks[i].actual_hours == "" ? 0 : tasks[i].actual_hours
                    // , workType == "" ? "work" : workType
                    , "work"
                    , on_cp
                    , assignees
                    , tasks[i].progress == "" ? 0 : parseInt(tasks[i].progress.replace(/[^a-zA-Z0-9 ]/g, ''))
                    , tasks[i].completed == "" ? false : tasks[i].completed 
                    , tasks[i].start ? tasks[i].start : tasks[i].container.start
                    , tasks[i].due ? tasks[i].due : tasks[i].container.due
                    , snapshot_date
                    , project_name
                  ]);

                console.log(tasks[i].dependent_of.length);
                for (var k = 0; k < tasks[i].dependent_of.length; k++) {
                    let dpdobj = [];
                    dpdmap.set(tasks[i].id, tasks[i].dependent_of[k]);
                    dpdobj.push(tasks[i].id);
                    dpdobj.push(tasks[i].dependent_of[k]);
                    dpdobj.push(snapshot_date);
                    dpdarr.push(dpdobj);
                }
            }
            
        }
        
        //** Insert into project master */
        await tempConnection.query('INSERT INTO project_master (project_id, project, gantt_url, snapshot_date) values (?)', [projectDetails]);
        console.log("Project master data inserted");

        //** INSERT TO GANTT_TABLE */
        await tempConnection.query('INSERT INTO gantt_chart (uid, project_uid, task_title, is_parent, is_milestone,parent_id, estimated_hour, actual_hour,task_type, on_cp, assignees, progress, completed, start_date, end_date, snapshot_date, project_name) VALUES ?', [val]);
        console.log("gantt data inserted");

        // ** INSERT DPD MAPPING*/
        await tempConnection.query('INSERT INTO depends_on_map (gantt_uid, dpd_uid, snapshot_date) VALUES ?', [dpdarr]);
        console.log("dependency mapping generated");

        // ** INSERT USER DATA*/
        const userSet = new Set();
        for (var i = 0; i < userAssignee.length; i++){
            if (!userSet.has(userAssignee[i][0])){
                const user = await tempConnection.query(`select user_id from user_mapping where user_id = '${userAssignee[i][0]}' and user_project_id = '${userAssignee[i][3]}'`);
                // console.log(user);
                if (!user.length) {
                    await tempConnection.query('INSERT INTO user_mapping (user_id, user_name, user_email, user_project_id) VALUES ?', [[userAssignee[i]]]);
                    userSet.add(userAssignee[i][0]);
                    console.log("user data initialized");
                }
            } 
        }
        
        await userTaskMap(req, res, next);
        await tempConnection.releaseConnection();
        return res.status(201).json({ status: 1, 
                                    project_id: project_id, 
                                    snapshot_date: snapshot_date, 
                                    message: "snasphot created " }
                                );
    }
    catch(err){
        await tempConnection.releaseConnection();
        console.log(err);
        return res.status(500).json({
            status: 0,
            msg: "failed to load snapshot",
            error: err
        });
    }
    
}

const userTaskMap = async (req, res, next) => {
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        const task_assignee = await tempConnection.query(`select task_id, uid, project_uid, assignees, snapshot_date from gantt_chart;`);
        let userTaskVal = [];
        for (var i = 0; i < task_assignee.length; i++){
            const taskAssignee = JSON.parse(task_assignee[i].assignees);
            for (var j = 0; j < taskAssignee.length; j++){
                const user_names = await tempConnection.query(`select user_name from user_mapping where user_id = '${taskAssignee[j]}'`);
                let snapshotDate = new Date(task_assignee[i].snapshot_date);
                
                if (!(user_names[0] == null)) {
                    userTaskVal.push([task_assignee[i].project_uid
                      , task_assignee[i].uid
                      , taskAssignee[j]
                      , snapshotDate
                      // , user_names[0].user_name
                    ]);
                }
                else{
                    userTaskVal.push([task_assignee[i].project_uid
                        , task_assignee[i].uid
                        , "NA"
                        , snapshotDate
                    ]);
                }
            }
        }
    
        await tempConnection.query('INSERT INTO user_task_map (project_id, task_uid, assignee_id, snapshot_date) VALUES ?', [userTaskVal]);
        console.log("user_task_map data inserted!!");
        await tempConnection.releaseConnection();
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(err);
        return res.status(500).json({
            status: 0,
            msg: "SERVER ERROR!!"
        });
    }
    
}

const isEmpty = (obj) => {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop))
        return false;
    }
    return true;
}

exports.scrape = scrape;