const express = require('express');
let mysql = require('../Utils/dbConnection');
let { validationResult } = require('express-validator');


//**Controller Functions */

//get all the project
const allProjects = async (req, res, next) => {
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        let projects = await tempConnection.query(`select DISTINCT gantt_chart.project_name, gantt_chart.project_uid from gantt_chart`);
        await tempConnection.releaseConnection();
        projects = [...new Map(projects.map(v => [v.project_uid, v])).values()];
        res.json({ status: 1, projects });
    } 
    catch (error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
      
}

// get snapshot date of that project id from above api
// same api for getting compare to dates
const snapshotDates = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project ID is not provided!!"
        });
    }
    const project_id = req.params.id;
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        const snapshot_dates = await tempConnection.query(`select distinct DATE_FORMAT(snapshot_date, "%Y-%m-%d") as snapshot_date from gantt_chart where project_uid = '${project_id}';`);
        await tempConnection.releaseConnection();
        return res.status(200).json({ status: 1, snapshotDates : snapshot_dates });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

// get all the contributors
const taskContributors = async (req, res, next) => {
    let tempConnection;
    try {
        tempConnection = await mysql.connection();
        const contributors = await tempConnection.query(`select distinct user_id, user_name from user_mapping where user_id is not null`);
        await tempConnection.releaseConnection();
        res.status(200).json({ status: 1, contributors });
    } 
    catch (error) {
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

//Project - TEST
// const projectSummary = async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({
//             status: 0,
//             msg: "Project ID , snapshot date, compare to date not provided!!"
//         });
//     }
//     let tempConnection;
//     const project_id = req.query.project_id;
//     const snapshot_date = req.query.snapshot_date;
//     const compare_to = req.query.compare_to;
    
//     if (isSameDay(new Date(snapshot_date), new Date(compare_to))) {
//         return res.status(200).json({ status: 0, message: "SAME_DATES_NOT_COMPARABLE" });
//     }

//     try{
//         tempConnection = await mysql.connection();
        
//         //progress
//         const progress_res = await tempConnection.query(`select sum(progress) as currProgress, COUNT(*) as total_progress from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}'`);
//         const progress = parseInt(Math.round(progress_res[0].currProgress / progress_res[0].total_progress));

//         //days elapsed new logic
//         const projectDates = await tempConnection.query(`select DATE_FORMAT(MAX(end_date), "%d-%b-%Y") as expected_end_date, 
//         CEIL((DATEDIFF(snapshot_date, min(start_date)) / DATEDIFF(MAX(end_date), min(start_date))) * 100) 
//         as time_elapsed,
//         ABS((DATEDIFF(MAX(end_date), snapshot_date))) as days_left   
//         from gantt_chart where project_uid = '${project_id}' and snapshot_date='${snapshot_date}';`);
//         const timeElapsed = projectDates[0].time_elapsed;
//         const days_left = projectDates[0].days_left;    
//         const expected_end_date = projectDates[0].expected_end_date;
//         let expected_end = { days_left, expected_end_date };    

//         //overdue tasks new logic
//         let overdue_tasks_data;
//         overdue_tasks_data = await tempConnection.query(`select task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, assignees,
//         ABS(DATEDIFF(snapshot_date, end_date))+1 as delay_days, "Overdue" as status, task_type, parent_id
//         from gantt_chart  
//         where project_uid = '${project_id}' and snapshot_date='${snapshot_date}' 
//         and snapshot_date > end_date and completed=0 and is_parent is false and is_milestone is false;`);
//         let parents_title = [];
//         overdue_tasks_data.filter((overdue)=>{
//             if(overdue.parent_id){
//                 parents_title.push(overdue.parent_id);
//             }
//         });

//         //delayed tasks new logic
//         const allMgt = await tempConnection.query(`select uid, task_title, DATE_FORMAT(start_date,"%Y-%m-%d") as start_date ,DATE_FORMAT(end_date,"%Y-%m-%d") as end_date
//         from gantt_chart  
//         where project_uid = '${project_id}' and snapshot_date='${snapshot_date}' 
//         and is_parent is false and is_milestone is false;`);
//         let delay_tasks_data = [];
//         const delay_params = allMgt.map((mgt)=> `row ('${mgt.end_date}', '${mgt.uid}', '${compare_to}', '${project_id}', '${mgt.end_date}')`);
        
//         delay_tasks_data = await tempConnection.query(`select task_id, task_type, parent_id ,task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, params.p1 as Actual_end_date,assignees,
//         ABS(DATEDIFF(params.p1, end_date))+1 as delay_days, "delay" as status from
//         (values ${delay_params.join(', ')}) 
//         params (p1, p2, p3, p4 ,p5)
//         join gantt_chart gc
//         on gc.uid = params.p2
//         and gc.snapshot_date = params.p3
//         and gc.project_uid = params.p4
//         and gc.end_date < params.p5
//         and gc.completed is true;`);

//         delay_tasks_data.filter((delay)=>{
//             if(delay.parent_id){
//                 parents_title.push(delay.parent_id);
//             }
//         });

//         let parentIDTitleMap;
//         if(parents_title.length !== 0){
//             const getParentsTitle = await tempConnection.query(`select uid, task_title from gantt_chart where uid in (?) and snapshot_date = '${snapshot_date}';`, [parents_title]);
//             if(getParentsTitle.length !== 0){
//                 parentIDTitleMap = new Map(getParentsTitle.map((parent)=>[parent.uid, parent.task_title]));
//             }
//         }
    
//         overdue_tasks_data = [...overdue_tasks_data, ...delay_tasks_data];
//         overdue_tasks_data.forEach((task)=>{
//             task.parent_title = parentIDTitleMap.has(task.parent_id) ? parentIDTitleMap.get(task.parent_id) : "NA";
//         });

//         let allAssignee = [];
//         for (var i = 0; i < overdue_tasks_data.length; i++) {
//             let assignee = JSON.parse(overdue_tasks_data[i].assignees);
//             overdue_tasks_data[i].assignees = assignee;
//             if(assignee[0]){
//                 let params = assignee.map(v => `'${v}'`);
//                 allAssignee = [...allAssignee, ...params];
//             }
//             else{
//                 overdue_tasks_data[i]["assignee_names"] = ["NA"];
//             }
//         }
        
//         if(allAssignee.length !== 0){
//             allAssignee = allAssignee.join(', ');
//             let user_names = await tempConnection.query(`select user_id, user_name from user_mapping where user_id in (${allAssignee})`);
//             user_names = new Map(user_names.map(u => [u.user_id, u.user_name]));
//             overdue_tasks_data.forEach((task)=>{
//                 if(!task.assignee_names){
//                     const assignee_names = [];
//                     task.assignees.forEach((a) => { 
//                         assignee_names.push(user_names.get(a));
//                     });
//                     task.assignee_names = assignee_names;
//                 }
//             });
//         }

//         //milestone new logic
//         let milestone_task;
//         const milestone_task_upcoming = await tempConnection.query(`SELECT task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, "Upcoming" as status, 
//         ABS(DATEDIFF('${snapshot_date}', end_date)) as delay_days
//         FROM gantt_chart WHERE 
//         is_milestone = 1 and project_uid = '${project_id}' 
//         and snapshot_date = '${snapshot_date}' 
//         and end_date >= '${snapshot_date}'
//         order by end_date asc limit 3;`);
//         let milestone_task_completed = await tempConnection.query(`SELECT task_id, uid ,task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, completed,"Completed" as status 
//         FROM gantt_chart WHERE 
//         is_milestone = 1 and project_uid = '${project_id}' 
//         and snapshot_date = '${snapshot_date}' 
//         and end_date <= '${snapshot_date}'
//         order by end_date;`);
        
//         const incomplete_milestone = [];
//         milestone_task_completed.forEach((milestone)=>{
//             if(!milestone.completed){
//                 incomplete_milestone.push(milestone.uid);
//             }
//         });
        
//         let check_milestone_pred = [];
//         if(incomplete_milestone.length !== 0){
//             check_milestone_pred = await tempConnection.query(`select uid, progress ,completed from gantt_chart where uid in (
//                 select dpd_uid from depends_on_map
//                 where gantt_uid in (?)
//                 and snapshot_date = '${snapshot_date}') and snapshot_date = '${snapshot_date}';`, [incomplete_milestone]);    
//         }
        
//         const incomplete_milestone_pred = [];
//         check_milestone_pred.forEach((pred)=>{
//                 if(pred.progress !== 100 || !pred.completed){
//                     incomplete_milestone_pred.push(pred.uid);
//                 }
//         });
        
//         if(incomplete_milestone_pred.length !== 0){
//             const truly_incomplete_milestone = await tempConnection.query(`select gantt_uid from depends_on_map
//             where dpd_uid in (?)
//             and snapshot_date = '${snapshot_date}';`, [incomplete_milestone_pred]);
            
//             truly_incomplete_milestone.forEach((incomplete_milestone)=>{
//                 milestone_task_completed = milestone_task_completed.filter((milestone)=>{
//                     if(milestone.uid !== incomplete_milestone.gantt_uid){
//                         return milestone;
//                     }
//                 });
//             });
//         }
//         const truly_completed_milestone = [];
//         milestone_task_completed.forEach((milestone)=>{
//             if(milestone.completed === 0){
//                 truly_completed_milestone.push(milestone.task_id);
//             }
//         });
        
//         if(truly_completed_milestone.length !== 0){
//             await tempConnection.query(`update gantt_chart set progress = 1, completed = true where task_id 
//                 in (?) and snapshot_date = '${snapshot_date}';`, [truly_completed_milestone]);
//         }

//         milestone_task_completed = await tempConnection.query(`SELECT task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, "Completed" as status, 
//         ABS(DATEDIFF('${snapshot_date}', end_date)) as delay_days
//         FROM gantt_chart WHERE 
//         is_milestone = 1 and project_uid = '${project_id}' 
//         and snapshot_date = '${snapshot_date}' 
//         and end_date <= '${snapshot_date}'
//         and completed is true
//         order by end_date limit 2;`);
//         milestone_task = [...milestone_task_completed, ...milestone_task_upcoming];

//         // * rework*/
//         // const rework = await query(`select count(*) as total_rework from gantt_chart where task_type='rework' and project_uid='${project_id}' and snapshot_date = '${snapshot_date}'`)
//         // let total_rework = rework[0].total_rework;

//         // delta goal end date
//         let del_goal_end
    
//         const goal_curr_snapshot = await tempConnection.query(`select max(end_date) as curr_end from gantt_chart where snapshot_date='${snapshot_date}' and project_uid = '${project_id}'`);
//         const goal_compare_snapshot = await tempConnection.query(`select max(end_date) as prev_end from gantt_chart where snapshot_date='${compare_to}' and project_uid = '${project_id}'`);
//         del_goal_end = diffDays(goal_curr_snapshot[0].curr_end, goal_compare_snapshot[0].prev_end);
//         const gantt_url = await tempConnection.query(`select gantt_url from project_master where project_id = '${project_id}' and snapshot_date = '${snapshot_date}';`);

//         await tempConnection.releaseConnection();

//         //delta next milestone
//         let schedule = {
//             del_goal_end : del_goal_end,
//             delNextMilestone: "",
//             delBuffeLastWeek: "",
//             delTotalRework: "",
//             delReworkLastWeek: ""
//         }
//         res.status(200).json(
//             { project_id,  url : gantt_url[0].gantt_url ,snapshot_date, compare_to, progress, timeElapsed, bufferUsed: 0, 
//               expected_end, schedule, overdue_tasks_data, milestone_task 
//             });
//     }
//     catch(error){
//         await tempConnection.releaseConnection();
//         console.log(error);
//         return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
//     }
// }

//Project Summary New Logic - TEST
const projectSummary = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "Project ID , snapshot date, compare to date not provided!!"
        });
    }
    let tempConnection;
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    const compare_to = req.query.compare_to;
    
    if (isSameDay(new Date(snapshot_date), new Date(compare_to))) {
        return res.status(200).json({ status: 0, message: "SAME_DATES_NOT_COMPARABLE" });
    }

    try{
        tempConnection = await mysql.connection();
        
        //progress
        const progress_res = await tempConnection.query(`select sum(progress) as currProgress, COUNT(*) as total_progress from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}'`);
        const progress = parseInt(Math.round(progress_res[0].currProgress / progress_res[0].total_progress));

        //days elapsed new logic
        const projectDates = await tempConnection.query(`select DATE_FORMAT(MAX(end_date), "%d-%b-%Y") as expected_end_date, 
        CEIL((DATEDIFF(snapshot_date, min(start_date)) / DATEDIFF(MAX(end_date), min(start_date))) * 100) 
        as time_elapsed,
        ABS((DATEDIFF(MAX(end_date), snapshot_date))) as days_left   
        from gantt_chart where project_uid = '${project_id}' and snapshot_date='${snapshot_date}';`);
        const timeElapsed = projectDates[0].time_elapsed;
        const days_left = projectDates[0].days_left;    
        const expected_end_date = projectDates[0].expected_end_date;
        let expected_end = { days_left, expected_end_date };    

        //overdue tasks new logic
        let overdue_tasks_data;
        overdue_tasks_data = await tempConnection.query(`select task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, assignees,
        ABS(DATEDIFF(snapshot_date, end_date)) as delay_days, "Overdue" as status, task_type, parent_id
        from gantt_chart  
        where project_uid = '${project_id}' and snapshot_date='${snapshot_date}' 
        and snapshot_date > end_date and completed=0 and is_parent is false and is_milestone is false;`);
        let parents_title = [];
        overdue_tasks_data.filter((overdue)=>{
            if(overdue.parent_id){
                parents_title.push(overdue.parent_id);
            }
        });

        //delayed tasks
        // const allMgt = await tempConnection.query(`select uid, task_title, DATE_FORMAT(start_date,"%Y-%m-%d") as start_date ,DATE_FORMAT(end_date,"%Y-%m-%d") as end_date
        // from gantt_chart  
        // where project_uid = '${project_id}' and snapshot_date='${snapshot_date}' 
        // and is_parent is false and is_milestone is false;`);
        // let delay_tasks_data = [];
        // const delay_params = allMgt.map((mgt)=> `row ('${mgt.end_date}', '${mgt.uid}', '${compare_to}', '${project_id}', '${mgt.end_date}')`);
        
        // delay_tasks_data = await tempConnection.query(`select task_id, task_type, parent_id ,task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, params.p1 as Actual_end_date,assignees,
        // ABS(DATEDIFF(params.p1, end_date))+1 as delay_days, "delay" as status from
        // (values ${delay_params.join(', ')}) 
        // params (p1, p2, p3, p4 ,p5)
        // join gantt_chart gc
        // on gc.uid = params.p2
        // and gc.snapshot_date = params.p3
        // and gc.project_uid = params.p4
        // and gc.end_date < params.p5
        // and gc.completed is true;`);

        delay_tasks_data = await tempConnection.query(`select curr.task_id, curr.task_type, curr.parent_id, curr.task_title, DATE_FORMAT(base.end_date,"%Y-%m-%d") as end_date , DATE_FORMAT(curr.end_date,"%Y-%m-%d") as Actual_end_date, curr.assignees,
        (DATEDIFF(curr.end_date, base.end_date)) as delay_days, "delay" as status
        from gantt_chart curr inner join 
        ( select task_id, uid, task_title, end_date from gantt_chart where snapshot_date = "${compare_to}" and project_uid = "${project_id}") base
        on curr.uid = base.uid
        and snapshot_date = "${snapshot_date}"
        and curr.project_uid = "${project_id}"
        and base.end_date < curr.end_date
        and curr.completed is true and curr.is_milestone is false and curr.is_parent is false;`);

        delay_tasks_data.filter((delay)=>{
            if(delay.parent_id){
                parents_title.push(delay.parent_id);
            }
        });

        let parentIDTitleMap;
        if(parents_title.length !== 0){
            const getParentsTitle = await tempConnection.query(`select uid, task_title from gantt_chart where uid in (?) and snapshot_date = '${snapshot_date}';`, [parents_title]);
            if(getParentsTitle.length !== 0){
                parentIDTitleMap = new Map(getParentsTitle.map((parent)=>[parent.uid, parent.task_title]));
            }
        }
    
        overdue_tasks_data = [...overdue_tasks_data, ...delay_tasks_data];
        overdue_tasks_data.forEach((task)=>{
            task.parent_title = parentIDTitleMap.has(task.parent_id) ? parentIDTitleMap.get(task.parent_id) : "NA";
        });

        let allAssignee = [];
        for (var i = 0; i < overdue_tasks_data.length; i++) {
            let assignee = JSON.parse(overdue_tasks_data[i].assignees);
            overdue_tasks_data[i].assignees = assignee;
            if(assignee[0]){
                let params = assignee.map(v => `'${v}'`);
                allAssignee = [...allAssignee, ...params];
            }
            else{
                overdue_tasks_data[i]["assignee_names"] = ["NA"];
            }
        }
        
        if(allAssignee.length !== 0){
            allAssignee = allAssignee.join(', ');
            let user_names = await tempConnection.query(`select user_id, user_name from user_mapping where user_id in (${allAssignee})`);
            user_names = new Map(user_names.map(u => [u.user_id, u.user_name]));
            overdue_tasks_data.forEach((task)=>{
                if(!task.assignee_names){
                    const assignee_names = [];
                    task.assignees.forEach((a) => { 
                        assignee_names.push(user_names.get(a));
                    });
                    task.assignee_names = assignee_names;
                }
            });
        }

        //milestone new logic
        let milestone_task;
        const milestone_task_upcoming = await tempConnection.query(`SELECT task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, "Upcoming" as status, 
        (DATEDIFF(end_date, (select end_date from gantt_chart where project_uid = '${project_id}' and snapshot_date = "${compare_to}" and uid = gc.uid))) as delay_days
        FROM gantt_chart gc WHERE 
        is_milestone = 1 and project_uid = '${project_id}' 
        and snapshot_date = '${snapshot_date}' 
        and end_date >= '${snapshot_date}'
        order by end_date asc limit 3;`);
        let milestone_task_completed = await tempConnection.query(`SELECT task_id, uid ,task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, completed,"Completed" as status 
        FROM gantt_chart WHERE 
        is_milestone = 1 and project_uid = '${project_id}' 
        and snapshot_date = '${snapshot_date}' 
        and end_date <= '${snapshot_date}'
        order by end_date;`);
        
        const incomplete_milestone = [];
        milestone_task_completed.forEach((milestone)=>{
            if(!milestone.completed){
                incomplete_milestone.push(milestone.uid);
            }
        });
        
        let check_milestone_pred = [];
        if(incomplete_milestone.length !== 0){
            check_milestone_pred = await tempConnection.query(`select uid, progress ,completed from gantt_chart where uid in (
                select dpd_uid from depends_on_map
                where gantt_uid in (?)
                and snapshot_date = '${snapshot_date}') and snapshot_date = '${snapshot_date}';`, [incomplete_milestone]);    
        }
        
        const incomplete_milestone_pred = [];
        check_milestone_pred.forEach((pred)=>{
                if(pred.progress !== 100 || !pred.completed){
                    incomplete_milestone_pred.push(pred.uid);
                }
        });
        
        if(incomplete_milestone_pred.length !== 0){
            const truly_incomplete_milestone = await tempConnection.query(`select gantt_uid from depends_on_map
            where dpd_uid in (?)
            and snapshot_date = '${snapshot_date}';`, [incomplete_milestone_pred]);
            
            truly_incomplete_milestone.forEach((incomplete_milestone)=>{
                milestone_task_completed = milestone_task_completed.filter((milestone)=>{
                    if(milestone.uid !== incomplete_milestone.gantt_uid){
                        return milestone;
                    }
                });
            });
        }
        const truly_completed_milestone = [];
        milestone_task_completed.forEach((milestone)=>{
            if(milestone.completed === 0){
                truly_completed_milestone.push(milestone.task_id);
            }
        });
        
        if(truly_completed_milestone.length !== 0){
            await tempConnection.query(`update gantt_chart set progress = 1, completed = true where task_id 
                in (?) and snapshot_date = '${snapshot_date}';`, [truly_completed_milestone]);
        }

        milestone_task_completed = await tempConnection.query(`SELECT task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, "Completed" as status, 
        (DATEDIFF(end_date, (select end_date from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${compare_to}' and uid = gc.uid))) as delay_days
            FROM gantt_chart gc WHERE 
            is_milestone = 1 and project_uid = '${project_id}' 
            and snapshot_date = '${snapshot_date}' 
            and end_date < '${snapshot_date}'
            and completed is true
            order by end_date limit 2;`);
        milestone_task = [...milestone_task_completed, ...milestone_task_upcoming];

        // * rework*/
        // const rework = await query(`select count(*) as total_rework from gantt_chart where task_type='rework' and project_uid='${project_id}' and snapshot_date = '${snapshot_date}'`)
        // let total_rework = rework[0].total_rework;

        // delta goal end date
        let del_goal_end
    
        const goal_curr_snapshot = await tempConnection.query(`select max(end_date) as curr_end from gantt_chart where snapshot_date='${snapshot_date}' and project_uid = '${project_id}'`);
        const goal_compare_snapshot = await tempConnection.query(`select max(end_date) as prev_end from gantt_chart where snapshot_date='${compare_to}' and project_uid = '${project_id}'`);
        del_goal_end = diffDays(goal_curr_snapshot[0].curr_end, goal_compare_snapshot[0].prev_end);
        const gantt_url = await tempConnection.query(`select gantt_url from project_master where project_id = '${project_id}' and snapshot_date = '${snapshot_date}';`);

        await tempConnection.releaseConnection();

        //delta next milestone
        let schedule = {
            del_goal_end : del_goal_end,
            delNextMilestone: "",
            delBuffeLastWeek: "",
            delTotalRework: "",
            delReworkLastWeek: ""
        }
        res.status(200).json(
            { project_id, url : gantt_url[0].gantt_url ,snapshot_date, compare_to, progress, timeElapsed, bufferUsed: 0, 
              expected_end, schedule, overdue_tasks_data, milestone_task 
            });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

//return task details
const taskDetails = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "Project ID, snapshot date are not provided!!"
        });
    }
    let tempConnection;
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    try{
        tempConnection = await mysql.connection();
        let task_details = await tempConnection.query(`SELECT gantt_chart.project_name, gantt_chart.project_uid, gantt_chart.uid, gantt_chart.task_title, gantt_chart.start_date, gantt_chart.end_date, gantt_chart.task_type, user_mapping.user_name FROM gantt_chart INNER JOIN user_task_map ON gantt_chart.project_uid=user_task_map.project_id and gantt_chart.uid = user_task_map.task_uid and gantt_chart.snapshot_date = user_task_map.snapshot_date INNER JOIN user_mapping on user_task_map.assignee_id = user_mapping.user_id and gantt_chart.snapshot_date='${snapshot_date}' and gantt_chart.project_uid = '${project_id}'`);
        if(task_details.length == 0){
            let task_details_without_assignees = await tempConnection.query(`SELECT gantt_chart.project_name, gantt_chart.project_uid, gantt_chart.uid,
            gantt_chart.task_title, gantt_chart.start_date, gantt_chart.end_date, 
            gantt_chart.task_type
            FROM gantt_chart INNER JOIN user_task_map ON gantt_chart.project_uid=user_task_map.project_id 
            and gantt_chart.uid = user_task_map.task_uid 
            and gantt_chart.snapshot_date = user_task_map.snapshot_date
            and gantt_chart.is_Parent = false and gantt_chart.is_milestone = false 
            and gantt_chart.snapshot_date='${snapshot_date}' and gantt_chart.project_uid = '${project_id}';`);
            await tempConnection.releaseConnection();
            task_details = task_details_without_assignees.map((task)=>{
                task.user_name = "NA"
                return task;
            });
        }
        else {
            await tempConnection.releaseConnection();
        }
        task_details =  [...new Map(task_details.map(v => [v.uid, v])).values()];
        res.status(200).json({ status: 1, task_details });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

// returns contributor details based on project ID, contributor ID
const contributorDetail = async (req, res, next) =>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "Project ID, contributor Id,snapshot date, compare to date are not provided!!"
        });
    }
    let tempConnection;
    const project_id = req.query.project_id;
    const contributor_id = req.query.contributor_id;
    const snapshot_date = req.query.snapshot_date;
    const compare_to = req.query.compare_to;
    try{
        tempConnection = await mysql.connection();
        let contributorData = await tempConnection.query(`SELECT gantt_chart.project_name, gantt_chart.project_uid, gantt_chart.uid, gantt_chart.task_title, gantt_chart.start_date, gantt_chart.end_date, gantt_chart.task_type, gantt_chart.progress, user_mapping.user_name FROM gantt_chart INNER JOIN user_task_map ON gantt_chart.project_uid=user_task_map.project_id and gantt_chart.uid = user_task_map.task_uid and gantt_chart.snapshot_date = user_task_map.snapshot_date INNER JOIN user_mapping on user_task_map.assignee_id = user_mapping.user_id and user_task_map.assignee_id = '${contributor_id}' and gantt_chart.snapshot_date='${snapshot_date}' and gantt_chart.project_uid = '${project_id}' order by gantt_chart.start_date`);
        //removing duplicate entries of tasks
        contributorData = [...new Map(contributorData.map(v => [v.uid, v])).values()];
        for (var i = 0; i < contributorData.length; i++) {
            //three option for task status ON_TIME, LATE, OVERDUE
            let task_status = "ON_TIME";
            if ((new Date(contributorData[i].end_date) < new Date(snapshot_date)) && (contributorData[i].progress < 100)) {
              task_status = "OVERDUE";
            }
            else {
                const compare_data = await tempConnection.query(`select * from gantt_chart where uid = '${contributorData[i].uid}' and snapshot_date = '${compare_to}' and project_uid = '${project_id}' and end_date < '${new Date(contributorData[i].end_date).toISOString().substring(0,10)}' and completed = 1`);
                compare_data.length > 0 ? task_status = "LATE" : task_status = "ON_TIME"; 
            }
            contributorData[i]["task_status"] = task_status;
            // contributorData[i]["crr_end"] = compare_data[i].end_date;
        }
        await tempConnection.releaseConnection();
        res.status(200).json({ status: 1, complianceScore: "", productivityScore: "", timelinessScore: "", contributorData });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

const performanceMetrics = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project Id, snapshot date, baseline date are not provided!!"
        });
    }
    let tempConnection;
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    const baseline_date = req.query.baseline_date;
    try{
        tempConnection = await mysql.connection();
        const basedata_query = await tempConnection.query(`select task_id, uid,on_cp, task_title, start_date, end_date, snapshot_date from gantt_chart where snapshot_date = '${baseline_date}' and is_parent = 0  order by start_date`);
        const actdata_query = await tempConnection.query(`select task_id, uid,on_cp, task_title, start_date, end_date, snapshot_date from gantt_chart where snapshot_date = '${snapshot_date}' and is_parent = 0  order by start_date`);
        const basedata = JSON.parse(JSON.stringify(basedata_query));
        const actdata = JSON.parse(JSON.stringify(actdata_query));
        const delayArray = [];
        const baselineData = [];
        for (var i = 0; i < basedata.length; i++) {
            baselineData.push(basedata[i]);
        }
        for (var i = 0; i < actdata.length; i++) {
            delayArray.push(actdata[i]);
        }
        
        //compare the act data array with the base data array and enter the base data end date to delayarray and also the additional task added in between the actual new snapshot
        for (var i = 0; i < actdata.length; i++) {
            for (var j = 0; j < basedata.length; j++) {
                if (actdata[i].uid == basedata[j].uid) {
                    delayArray[i]["base_end_date"] = basedata[j].end_date;
                }
            }
        }
        let diffAEBE;
        for (var i = 0; i < delayArray.length; i++) {
            if (delayArray[i].base_end_date) {
                diffAEBE = diffDays_inPerformance(new Date(delayArray[i].end_date), new Date(delayArray[i].base_end_date));
                // console.log(diffAEBE);
                delayArray[i]["AEsubBE"] = diffAEBE;
                delayArray[i]["predec_delay"] = 0;
                delayArray[i]["net_delay"] = 0;
            }
            else {
                delayArray[i]["base_end_date"] = "NA";
                diffAEBE = 0
                // console.log(diffAEBE)
                delayArray[i]["AEsubBE"] = diffAEBE;
                delayArray[i]["predec_delay"] = 0;
                delayArray[i]["net_delay"] = 0;
            }
        }
        let delayedArr = delayArray.sort((a, b) => Date.parse(new Date(a.start_date)) - Date.parse(new Date(b.start_date)));
        let baselineDataArr = baselineData.sort((a, b) => Date.parse(new Date(a.start_date)) - Date.parse(new Date(b.start_date)));
        let dpdMapping = [];
        const dpdtask = await tempConnection.query(`select gantt_uid, dpd_uid from depends_on_map where snapshot_date = '${snapshot_date}'`);
        for (var i = 0; i < dpdtask.length; i++) {
            let dpd = [];
            dpd.push(dpdtask[i].gantt_uid);
            dpd.push(dpdtask[i].dpd_uid);
            dpdMapping.push(dpd);
        }
        let dpdMappingBaseline = [];
        const dpdtask_baseline = await tempConnection.query(`select gantt_uid, dpd_uid from depends_on_map where snapshot_date = '${baseline_date}'`);
        for (var i = 0; i < dpdtask_baseline.length; i++) {
            let dpd = [];
            dpd.push(dpdtask_baseline[i].gantt_uid);
            dpd.push(dpdtask_baseline[i].dpd_uid);
            dpdMappingBaseline.push(dpd);
        }

        for (var i = 0; i < dpdMapping.length; i++) {
            let pred_task_uid = dpdMapping[i][1];
            let successor_uid = dpdMapping[i][0];;
      
            //search for the pred task in delayedArr
            let pred_task_data = delayedArr.find(e => {
                if (e.uid == pred_task_uid) {
                    let new_predec_uid;
                    if (e.base_end_date == "NA") {
                    //successor = dpdmapping[i][0] find the predecessor of the successor in dpdMappingof Baseline data, we will get new_predec_uid, search the new one in delayed array and do operation jus like for normal tasks  */
                    let predecessor_delay = 0;
                        for (var k = 0; k < dpdMappingBaseline.length; k++) {
                            if (successor_uid == dpdMappingBaseline[k][0]) {
                                new_predec_uid = dpdMappingBaseline[k][1];
                                delayedArr.find(a => {
                                    if (a.uid == new_predec_uid) {
                                        let predDelay = diffDays(new Date(e.end_date), new Date(a.base_end_date))
                                        predecessor_delay = Math.max(predDelay, predecessor_delay);
                                    }
                                });
                                
                                delayedArr.find(b => {
                                    if (b.uid == successor_uid) {
                                        b.predec_delay = predecessor_delay;
                                        b.net_delay = b.AEsubBE - b.predec_delay
                                    }
                                });
                            }
                        }
                    }
                    else {
                        let predecessor_delay = 0;
                        let predDelay = diffDays(new Date(e.end_date), new Date(e.base_end_date));
                        predecessor_delay = Math.max(predDelay, predecessor_delay);
                        console.log(predecessor_delay);
                        console.log(e.task_title);
                        delayedArr.find(b => {
                            if (b.uid == successor_uid) {
                                console.log(b.task_title);
                                b.predec_delay = predecessor_delay;
                                b.net_delay = b.AEsubBE - b.predec_delay;
                            }
                        });
                    }
                }
            });
        }

        let user_delay = [];
        for (var i = 0; i < delayedArr.length; i++) {
            let res = await tempConnection.query(`select user_name from user_mapping where user_id in (select assignee_id from user_task_map where task_uid = '${delayedArr[i].uid}' and snapshot_date='${snapshot_date}') and user_project_id = '${project_id}' `);
            if (res.length > 0) {
                let userNetDelay = [];
                userNetDelay.push(res[0].user_name);
                userNetDelay.push(delayedArr[i].net_delay);
                user_delay.push(userNetDelay);
            }
        }
        await tempConnection.releaseConnection();
        console.log("This is user delay", user_delay);
        res.json({ msg: "done", basedata, actdata, delayedArr, dpdMapping, dpdMappingBaseline, user_delay});
        
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

const timelinessTaskDetails = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project Id, snapshot date, baseline date are not provided!!"
        });
    }
    let tempConnection;
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    const baseline_date = req.query.baseline_date;
    let working_days; let payload_dates = [];
    try{
        tempConnection = await mysql.connection();
        const base_data = await tempConnection.query(`select task_id, uid, assignees, parent_id ,on_cp, task_type, task_title, DATE_FORMAT(start_date,"%Y-%m-%d") as start_date, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, DATE_FORMAT(snapshot_date,"%Y-%m-%d") as snapshot_date from gantt_chart where snapshot_date = '${baseline_date}' and project_uid = '${project_id}' and is_parent = 0 and is_milestone is false order by start_date`);
        const actual_data = await tempConnection.query(`select task_id, uid, assignees, parent_id ,on_cp, task_type, task_title, DATE_FORMAT(start_date,"%Y-%m-%d") as start_date, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, DATE_FORMAT(snapshot_date,"%Y-%m-%d") as snapshot_date from gantt_chart where snapshot_date = '${snapshot_date}' and project_uid = '${project_id}' and is_parent = 0 and is_milestone is false order by start_date`);
        let delayArray = [...actual_data];
        const baselineData = [...base_data];
        working_days = {"0":false,"1":true,"2":true,"3":true,"4":true,"5":true,"6":false};
        // payload_dates = JSON.parse([{"name": "EL","color": "highlight-1","end": "2023-01-02","id": "0hu6PnaNquFjaHvTmX7l","is_holiday": true,"on_workspace": true,"start": "2023-01-02","supplier_project_id": "","disabled": false,"user_id": "lPcX4XZJXP0MRb0XBO10"}]);
        const task_id_data_map = new Map(baselineData.map(task => [task.uid, task]));
        let diffAEBE;
        const delayArrforMap = [];
        let allAssignee = [];
        let allParents = [];
        delayArray.forEach((task)=>{
            if(task_id_data_map.has(task.uid)){
                task.base_end_date = task_id_data_map.get(task.uid).end_date;
                diffAEBE = diffDays_inPerformance(new Date(task.end_date), new Date(task.base_end_date));
                task.AEsubBE = diffAEBE;
                numOfNonWorkingDays = checkWeekends(new Date(task.start_date), new Date(task.end_date),working_days, payload_dates);
                task.num_of_nonWorkingDays = numOfNonWorkingDays;
                task.user_delay = [];
                task.predec_delay = 0;
                task.net_delay = 0;
            }
            else{
                task.base_end_date = "NA";
                task.predec_delay = 0;
                task.AEsubBE = 0;
                task.net_delay = 0;
            }
            task.assignees = JSON.parse(task.assignees);
            task.assignees.forEach((assignee)=>{if(assignee){allAssignee.push(assignee)}});    
            delayArrforMap.push([task.uid, task]);
            allParents.push(task.parent_id);    
        });
        const delayArrayMap = new Map(delayArrforMap);
        let userNameMap;
        if(allAssignee.length !== 0){
            let user_names = await tempConnection.query(`select user_id, user_name from user_mapping where user_id in (?);`, [allAssignee]);
            if(user_names.length !== 0){
                userNameMap = new Map(user_names.map(u => [u.user_id, u.user_name]));
            }
        }
        let parentIDTitleMap;
        if(allParents.length !== 0){
            const getParentsTitle = await tempConnection.query(`select uid, task_title from gantt_chart where uid in (?) and snapshot_date = '${snapshot_date}';`, [allParents]);
            if(getParentsTitle.length !== 0){
                parentIDTitleMap = new Map(getParentsTitle.map((parent)=>[parent.uid, parent.task_title]));
            }
        }
        
        let dpdMapping = [];
        const dpdtask = await tempConnection.query(`select gantt_uid, dpd_uid from depends_on_map where snapshot_date = '${snapshot_date}'`);
        dpdtask.forEach((task)=>{
            let dpd = [];
            dpd.push(task.gantt_uid);
            dpd.push(task.dpd_uid);
            dpdMapping.push(dpd);
        });
        
        let dpdMappingBaseline = [];
        const dpdtask_baseline = await tempConnection.query(`select gantt_uid, dpd_uid from depends_on_map where snapshot_date = '${baseline_date}'`);
        await tempConnection.releaseConnection();
        
        dpdtask_baseline.forEach((task)=>{
            let dpd = [];
            dpd.push(task.gantt_uid);
            dpd.push(task.dpd_uid);
            dpdMappingBaseline.push(dpd);
        });

        for(let i=0; i < dpdMapping.length; i++){
            let pred_task_uid = dpdMapping[i][1];
            let successor_uid = dpdMapping[i][0];
            if(delayArrayMap.has(pred_task_uid)){
                const pred = delayArrayMap.get(pred_task_uid);
                let new_predec_uid;
                if(pred.base_end_date == "NA"){
                    let predecessor_delay = 0;
                    for(var k = 0; k < dpdMappingBaseline.length; k++){
                        if(successor_uid == dpdMappingBaseline[k][0]){
                            new_predec_uid = dpdMappingBaseline[k][1];
                            if(delayArrayMap.has(new_predec_uid)){
                                const a = delayArrayMap.get(new_predec_uid);
                                let predDelay = diffDays(new Date(pred.end_date), new Date(a.base_end_date));
                                predecessor_delay = Math.max(predDelay, predecessor_delay);
                            }

                            if(delayArrayMap.has(successor_uid)){
                                const b = delayArrayMap.get(successor_uid);
                                b.predec_delay = predecessor_delay;
                                b.net_delay = b.AEsubBE;
                                b.net_delay = (b.net_delay == 0) ? b.net_delay : b.net_delay -  b.predec_delay - b.num_of_nonWorkingDays;
                                delayArrayMap.set(successor_uid, b);
                            }
                        }
                    }
                }
                else{
                    let predecessor_delay = 0;
                    let predDelay = diffDays(new Date(pred.end_date), new Date(pred.base_end_date));
                    predecessor_delay = Math.max(predDelay, predecessor_delay);
                    if(delayArrayMap.has(successor_uid)){
                        const b = delayArrayMap.get(successor_uid);
                        b.predec_delay = predecessor_delay;
                        b.net_delay = b.AEsubBE;
                        b.net_delay = (b.net_delay == 0) ? b.net_delay : b.net_delay -  b.predec_delay - b.num_of_nonWorkingDays;
                        delayArrayMap.set(successor_uid, b);
                    }
                }
            }
        }
        
        delayArray = [...delayArrayMap.values()]
        delayArray.forEach((task)=>{
            const assignees = [];
            for(let i = 0; i < task.assignees.length; i++){
                if(task.assignees[i]){
                    if(userNameMap.has(task.assignees[i])){
                        assignees.push(userNameMap.get(task.assignees[i]));
                    }
                }
                else{
                    break;
                }
            }
            task.assignees = assignees;
            if(task.parent_id){
                if(parentIDTitleMap.has(task.parent_id)){
                    task.parent_name = parentIDTitleMap.get(task.parent_id);
                }
                else{
                    task.parent_name = "";
                }
            }else{
                task.parent_name = "";
            }
        });
       
        res.json({ delayArray});
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

const addNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project Id and note are not provided!!"
        });
    }
    let tempConnection;
    const { project_id, note } = req.body;
    const val = [];
    val.push([project_id, note]);
    try{
        tempConnection = await mysql.connection();
        await tempConnection.query('INSERT INTO project_notes(project_id, note) VALUES ?', [val]);
        await tempConnection.releaseConnection();
        return res.status(201).json({ status: 1, message: "note created" }); 
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

const getNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project Id is not provided !!"
        });
    }
    let tempConnection;
    let project_id = req.params.id;
    try{
        tempConnection = await mysql.connection();
        const notes = await tempConnection.query(`select project_id, note, createdAt from project_notes where project_id = '${project_id}'`);
        await tempConnection.releaseConnection();
        res.status(200).json({ status: 1, notes });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}


// get latest project summary i.e of latest snapshot
const loadLatestProjectSummary = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "Project ID is not provided!!"
        });
    }
    let tempConnection;
    const project_id = req.query.project_id;
    let snapshot_date;
    try{
        tempConnection = await mysql.connection();
        
        //get latest snapshot date 
        snapshot_date = await tempConnection.query(`select DATE_FORMAT(MAX(snapshot_date), "%Y-%m-%d") as snapshot_date from project_master where project_id='${project_id}';`);
        snapshot_date = snapshot_date[0].snapshot_date;

        // find progress
        const progress_res = await tempConnection.query(`select sum(progress) as currProgress, COUNT(*) as total_progress from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}'`);
        const progress = parseInt(Math.round(progress_res[0].currProgress / progress_res[0].total_progress));

        // time elapsed
        const projectDates = await tempConnection.query(`select DATE_FORMAT(min(start_date), "%Y-%m-%d") as start_date, DATE_FORMAT(MAX(end_date), "%Y-%m-%d") as due_date, DATE_FORMAT(snapshot_date, "%Y-%m-%d") as curr_date from gantt_chart where project_uid = '${project_id}' and snapshot_date='${snapshot_date}';`);
        const start_date = new Date(projectDates[0].start_date);
        const due_date = new Date(projectDates[0].due_date);
        const curr_date = new Date(projectDates[0].curr_date);
        const total_days_assigned = diffDays(due_date, start_date)+1;
        const total_days_elapsed = diffDays(curr_date, start_date)+1;
        const timeElapsed = parseInt(Math.ceil((total_days_elapsed / total_days_assigned) * 100));
        
        //expected end date
        let days_left = diffDays(due_date, curr_date)+1;
        if(curr_date > due_date){
            days_left = -days_left;
        }
        let expected_end = { days_left, expected_end_date: getFormattedDate(due_date)};
        
        //overdue tasks
        let overdue_tasks_data = await tempConnection.query(`select task_id, task_title, DATE_FORMAT(end_date,"%Y-%m-%d") as end_date, assignees from gantt_chart where project_uid = '${project_id}' and snapshot_date='${snapshot_date}' and snapshot_date > end_date and completed is false and is_milestone is false and is_parent is false;`);
        for(let i = 0; i < overdue_tasks_data.length; i++){
            overdue_tasks_data[i].deadline = getFormattedDate(new Date(overdue_tasks_data[i].end_date));
            let assignee_names = [];
            overdue_tasks_data[i].delay_days = diffDays(new Date(snapshot_date), new Date(overdue_tasks_data[i].end_date)); 
            const assignees = JSON.parse(overdue_tasks_data[i].assignees);
            for(let j = 0; j < assignees.length; j++){
                const user_names = await tempConnection.query(`select user_name from user_mapping where user_id = '${assignees[j]}'`);
                if(user_names.length != 0){
                    assignee_names.push(user_names[0].user_name);
                }
            }
            overdue_tasks_data[i].assigned_to = assignee_names.join(", ");
            delete overdue_tasks_data[i].assignees;
            delete overdue_tasks_data[i].end_date;
        }

        //milestones
        let milestone_task = await tempConnection.query(`SELECT task_id, task_title, DATE_FORMAT(end_date, "%Y-%m-%d") as end_date, completed FROM gantt_chart WHERE is_milestone is true and project_uid = '${project_id}' and snapshot_date = '${snapshot_date}' order by end_date;`);
        for(let i = 0; i < milestone_task.length; i++){
            milestone_task[i].deadline = getFormattedDate(new Date(milestone_task[i].end_date));
            if(new Date(milestone_task[i].end_date) >= new Date(snapshot_date)){
                milestone_task[i].status = "Upcoming";
            }
            else{
                milestone_task[i].status = !milestone_task[i].completed ? "Not Completed" : "Completed"; 
            }
            delete milestone_task[i].completed;
            delete milestone_task[i].end_date;
        }

        //notes 
        let notes = await tempConnection.query(`select id, note, DATE_FORMAT(createdAt, "%d-%b-%Y %l:%i %p") as created_at from project_notes where project_id='${project_id}';`);
        await tempConnection.releaseConnection();
        res.json({
            project_details: {  project_id, snapshot_date, compare_to: "", progress, timeElapsed, bufferUsed: 0, expected_end   },
            overdue_tasks_data,
            milestone_task,
            notes
        });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" });
    }
}

// delete a snapshot data
const deleteSnapshot = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project ID or Snapshot Date not provided!!"
        });
    }
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        
        // delete from project_master table
        let query = `select pid from project_master where project_id='${project_id}' and snapshot_date='${snapshot_date}';`;
        let queryResult = await tempConnection.query(query);
        let values = [];
        for(let i = 0; i < queryResult.length; i++){
            values.push(queryResult[i].pid);
        }
        if(values.length != 0){
            await tempConnection.query(`delete from project_master where pid in (?);`, [values]);
        }
        
        // delete from non_working_days table
        //** uncomment the logic when this table is added in DB */
        // values = [];
        // query = `select id from non_working_days where project_id='${project_id}' and snapshot_date='${snapshot_date}';`;
        // queryResult = await tempConnection.query(query);
        // for(let i = 0; i < queryResult.length; i++){
        //     values.push(queryResult[i].id);       
        // }
        // if(values.length != 0){
        //     await tempConnection.query(`delete from non_working_days where id in (?);`, [values]);
        // }
        

        //delete from depends_on_map table
        values = [];
        query = `select dom.dpd_id from depends_on_map dom inner join gantt_chart gc
        on dom.gantt_uid = gc.uid
        and gc.project_uid = '${project_id}' and gc.snapshot_date = '${snapshot_date}'
        and dom.snapshot_date = '${snapshot_date}';`;
        queryResult = await tempConnection.query(query);
        for(let i = 0; i < queryResult.length; i++){
            values.push(queryResult[i].dpd_id);     
        }
        if(values.length != 0){
            await tempConnection.query(`delete from depends_on_map where dpd_id in (?);`, [values]);
        }
        

        // delete from gantt_chart table 
        query = `select task_id from gantt_chart where project_uid='${project_id}' and snapshot_date='${snapshot_date}';`;
        values = [];
        queryResult = await tempConnection.query(query);
        for(let i = 0; i < queryResult.length; i++){
            values.push(queryResult[i].task_id);
        }
        if(values.length != 0){
            await tempConnection.query(`delete from gantt_chart where task_id in (?);`, [values]);
        }
        
        // delete from user_task_map table
        values = [];
        query = `select id from user_task_map where project_id='${project_id}' and snapshot_date='${snapshot_date}';`;
        queryResult = await tempConnection.query(query);
        for(let i = 0; i < queryResult.length; i++){
            values.push(queryResult[i].id);
        }
        if(values.length != 0){
            await tempConnection.query(`delete from user_task_map where id in (?);`, [values]);
        }
        await tempConnection.releaseConnection();
        res.json({
            status: 1,
            msg: "data deleted successfully"
        });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR", error });
    }
}

const addBuffer = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project ID or Snapshot Date not provided!!"
        });
    }
    let tempConnection;
    let projectID = req.query.project_id;
    let techDifficulty = req.query.techDifficulty == 'low' ? 1 : req.query.techDifficulty == 'medium' ? 2 : req.query.techDifficulty == 'high' ? 3 : -1;
    let taskInterdpd = req.query.taskInterdpd == 'low' ? 1 : req.query.taskInterdpd == 'medium' ? 2 : req.query.taskInterdpd == 'high' ? 3 : -1;
    let projectDuration = -1;
    let buffer;
    try{
        tempConnection = await mysql.connection();
        const oldest_snapshot_date = await tempConnection.query(`select DATE_FORMAT(min(snapshot_date), "%Y-%m-%d") as snapshot_date from gantt_chart where project_uid = '${projectID}'`);
        const projectDates = await tempConnection.query(`select DATE_FORMAT(min(start_date), "%Y-%m-%d") as start_date, DATE_FORMAT(MAX(end_date), "%Y-%m-%d") as due_date, DATE_FORMAT(snapshot_date, "%Y-%m-%d") as curr_date from gantt_chart where project_uid = '${projectID}' and snapshot_date = '${oldest_snapshot_date[0].snapshot_date}';`);
        await tempConnection.releaseConnection();
        const start_date = new Date(projectDates[0].start_date);
        const due_date = new Date(projectDates[0].due_date);
        projectDuration = diffDays(due_date, start_date)+1;
        projectDuration = projectDuration/30;
        buffer = projectDuration * (techDifficulty + taskInterdpd);
        res.json({
            projectDuration,
            techDifficulty,
            taskInterdpd,
            buffer
        });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR", error });
    }
}

//**Helper Functions */
const checkWeekends = (start_date, end_date, working_days, payload_dates)=>{
    let count = 0;
    let loop = new Date(start_date);
    while(loop <= end_date){
    //checking if it was a working day or not by comparing dates from working_day object from JSON payload
        if(!working_days[loop.getDay()]){
            count++;
        }
    
    // check if any date b/w start and end date was a company holiday ???
        // for(let i = 0; i < payload_dates.length; i++){
        //     if(payload_dates[i]["user_id"] == false){
        //         if(payload_dates[i]["start"] == loop.getFullYear()+"-"+(loop.getMonth()+1)+"-"+loop.getDate()){   
        //             let numOfDays = numOfCompanyHoliday(new Date(payload_dates[i]["start"]), new Date(payload_dates[i]["end"]));
        //             count += numOfDays;
        //         }
        //     }
        // }
        let newDate = loop.setDate(loop.getDate()+1);
        loop = new Date(newDate);
    }
    return count;    
}

const numOfCompanyHoliday = (start_date, end_date) => {
    let count = 0;
    let loop = new Date(start_date);
    while(loop <= end_date){
        count++;
        let newDate = loop.setDate(loop.getDate()+1);
        loop = new Date(newDate);
    }
    return count;
}

const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth();
}

//x-max date , y-min date
const diffDays = (max_date, min_date)=>{
  const timeDiff = Math.abs(max_date - min_date);
  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return dayDiff;
}

const diffDays_inPerformance = (max_date, min_date) =>{
    const timeDiff = max_date - min_date;
    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return dayDiff
}

const getFormattedDate = (date) => {
    let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
    let mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
    let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
    return `${da}-${mo}-${ye}`; 
}

const progressBasedDuration = async (req, res, next) => {
    const projectID = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        let progress = await tempConnection.query(`select (SUM((progress * (DATEDIFF(end_date, start_date)+1))) / SUM(DATEDIFF(end_date, start_date)+1)) as progress 
        from gantt_chart where project_uid = '${projectID}' and snapshot_date = '${snapshot_date}' 
        and is_parent is false;`);
        await tempConnection.releaseConnection();
        progress = parseFloat(progress[0].progress);
        res.json({
            status: 1,
            progress
        });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR", error });
    }
}

const progressBasedEffort = async (req, res, next) => {
    const projectID = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        const progressData = await tempConnection.query(`select estimated_hour, actual_hour, completed, (DATEDIFF(end_date,start_date)+1) as days from gantt_chart 
        where project_uid = '${projectID}' 
        and snapshot_date = '${snapshot_date}' 
        and is_parent is false;`);
        await tempConnection.releaseConnection();
        let effort = 0;
        let totalEffort = 0;
        progressData.forEach((prog)=>{
            if(prog.completed){
                if(prog.actual_hour){
                    effort = effort + prog.actual_hour;
                    totalEffort = totalEffort + prog.actual_hour;
                }
                else if(prog.estimated_hour){
                    effort = effort + prog.estimated_hour;
                    totalEffort = totalEffort + prog.estimated_hour;    
                }
                else{
                    effort = effort + (6 * prog.days);
                    totalEffort = totalEffort + (6 * prog.days);
                }
            }
            else{
                if(prog.actual_hour){
                    totalEffort = totalEffort + prog.actual_hour;
                }
                else if(prog.estimated_hour){
                    totalEffort = totalEffort + prog.estimated_hour;    
                }
                else{
                    totalEffort = totalEffort + (6 * prog.days);
                }
            }
        });
        res.json({
            status: 1,
            effort,
            totalEffort,
            progress : parseFloat(((effort/totalEffort)*100).toFixed(3))
        });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR", error });
    }
}

const getCompareTodate = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "project ID or snapshot date is not provided!!"
        });
    }
    const projectID = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    let dates = [];
    let tempConnection;
    try{
        tempConnection = await mysql.connection();
        dates = await tempConnection.query(`select distinct DATE_FORMAT(snapshot_date, "%Y-%m-%d") as snapshot_date from gantt_chart where project_uid = '${projectID}' and snapshot_date < "${snapshot_date}";`);
        await tempConnection.releaseConnection();
        res.status(200).json({ status: 1, snapshotDates : dates });
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR", error });
    }
}

exports.allProjects = allProjects;
exports.snapshotDates = snapshotDates;
exports.taskContributors = taskContributors;
exports.projectSummary = projectSummary;
exports.taskDetails = taskDetails;
exports.contributorDetail = contributorDetail;
exports.performanceMetrics = performanceMetrics;
exports.addNote = addNote;
exports.getNote = getNote;
exports.loadLatestProjectSummary = loadLatestProjectSummary;
exports.deleteSnapshot = deleteSnapshot;
exports.addBuffer = addBuffer;
exports.progressBasedDuration = progressBasedDuration;
exports.progressBasedEffort = progressBasedEffort;
exports.timelinessTaskDetails = timelinessTaskDetails;
exports.getCompareTodate = getCompareTodate;