const fs = require("fs");
const axios = require("axios")
const express = require('express');
let { validationResult } = require('express-validator');

const check_Errors_Warnings = async (req, res, next) => {
    const validation_errors = validationResult(req);
    if (!validation_errors.isEmpty()) {
        return res.status(400).json({
            status: 0,
            msg: "snapshot date or snapshot url is not provided!!"
        });
    }

    let snapshot_date = req.body.snapshot_date.trim();
    let snapshot_url = req.body.snapshot_url.trim();
    let errors; let warnings;
    let snapshoData;
    try{
        const [snapshot, test] = await fetchDataAsync(snapshot_url+'.json');
        errors = checkErrors(test);
        warnings = checkWarnings(test);
        if(errors.hanging.length === 0 && errors.time.length === 0){
            snapshoData = scrape_data(snapshot_url, snapshot_date, snapshot);
        }
        res.json({errors, warnings, snapshoData});    
    }
    catch(error){
        console.log(error);
        return res.status(500).json({ status: 0, msg: "failed to load snapshot", error: error });
    }
}

const scrape_data = (snapshot_url, snapshot_date, snapshot) => {
    let ganttChartValues = [];
    let userAssignees = [];
    let dependencyValues = []; dpdarr = [];
    let users = new Map();
    let userTaskMap = [];
    const {tasks, project} = snapshot;
    let project_name = project.name;
    let project_id = project.id;
    //project details to store in project master
    let projectMasterValues = [project_id, project_name, snapshot_url, snapshot_date];

    //creating assginee and user assignee array
    ganttChartValues = tasks.map((task)=> {
       let assignees = [];
       assignees = task.users.map((user)=>{
           if(user){
               if(!users.has(user.user_id)){
                   users.set(user.user_id, [user.user_id, user.name, user.email, project_id]);
               }
               userTaskMap.push([project_id, task.id, user.user_id, snapshot_date]);
               return user.user_id;
           }
           else{
               userTaskMap.push([project_id, task.id, "NA", snapshot_date]);
               return null; 
           }
       });
       let task_type = checkTaskType(task.custom_fields);
       let on_cp = checkOnCp(task.custom_fields);                    
       if(task.dependent_of.length > 0){
           dependencyValues = [...dependencyValues, ...task.dependent_of.map((val)=> [task.id, val, snapshot_date])];
       }
       return [
           task.id, project_id, task.name, task.subtasks == 0 ? false : true, task.is_milestone, task.parent.id ? task.parent.id : "",
           task.estimated_hours == "" ? 0 : task.estimated_hours, task.actual_hours == "" ? 0 : task.actual_hours, task_type,
           on_cp, JSON.stringify(assignees), task.progress == "" ? 0 : parseInt(task.progress.replace(/[^a-zA-Z0-9 ]/g, '')) ,
           task.completed == "" ? false : task.completed, task.start ? task.start : task.container.start,
           task.due ? task.due : task.container.due, snapshot_date, project_name 
       ];
   });
   userAssignees = [...users.values()];
   return {projectMasterValues, ganttChartValues, dependencyValues, userTaskMap, userAssignees};

}

async function fetchDataAsync(url) {
    const response = await axios.get(url);
    //map initialization
    const test = new Map();
    if(response){
        snapshot = await response.data;
        const {tasks, project} = snapshot;
        //map code
        tasks.forEach((task)=>{
            if(task.subtasks == 0 && task.is_milestone == false){
                if(!test.has(task.id)){
                    test.set(task.id, task);
                }
            }
        });

        return [snapshot, test];
    }
    else{
        throw new Error("Failed to load snapshot");
    }
}

const checkDependentOfArray = (arr) => {
    if(arr.length === 0 || (arr.length == 1 && arr[0] == "")){
        return true;
    }
    else{
        return false;
    }
}

const getSuccessorStartTime = (successorsID, test) => {
    return new Date(test.get(successorsID).start);
}

const getPredecessorDueTime = (predecessorID, test) => {
    return new Date(test.get(predecessorID).due);
}

const checkSuccessorTime = (curTask, test) => {
    let successors = [];
    let result = {
        status : 0,
        at: []
    }
    let timeObject = {
        P_ID : "",
        S_ID: "",
        P_date : "",
        S_date: ""
    }
    test.forEach((values, keys)=>{
        if(values.dependent_of > 0){
            if(values.dependent_of.includes(curTask)){
                successors.push(values.id);
            }
        }
    });

    for(let i = 0; i < successors.length; i++){
        let P_Date = getPredecessorDueTime(curTask, test); 
        let S_Date = getSuccessorStartTime(successors[i], test);
        if( P_Date > S_Date){
            timeObject.P_ID = curTask;
            timeObject.S_ID = successors[i];
            timeObject.P_date = P_Date;
            timeObject.S_date = S_Date;
            result.at = [...result.at, timeObject];
        }
    }

    if(result.at.length == 0){
        result.status = 1;
    }
    return result;
    
}

const findTask1 = (test) => {
    let [firstValue] = test.values();
    let firstTask = new Date(firstValue.start);
    let task1 = {
        id : firstValue.id,
        name: firstValue.name
    }
    test.forEach((values, keys)=>{
        if(new Date(values.start) < firstTask && values.subtasks == 0){
            firstTask = new Date(values.start);
            task1 = {
                id : values.id,
                name: values.name
            }
        }
    });
    return task1;
}

const checkForSubtaskandDependency = (test) => {
    let result = [];
    test.forEach((values,keys)=>{
        if(values.subtasks == 0 && checkDependentOfArray(values.dependent_of) && values.is_milestone == false ){
            result = [...result, { id: values.id, name : values.name}]
        }
    });
    const firstTask = findTask1(test);
    result = result.filter((obj)=>{
        return (obj.id !== firstTask.id)
    });

    return result;
}

const checkUsersArray = (arr) => {
    if(arr.length == 0 || (arr.length == 1 && arr[0] == null)){
        return true;
    }
    else{
        return false;
    }
}

const checkAssignees = (test) => {       
    let result = [];
    test.forEach((values,keys)=>{
        if(values.subtasks == 0 && checkUsersArray(values.users) && values.is_milestone == false ){
            result = [...result, { id: values.id, name : values.name}]
        }
    });
    return result;
}

const overduecheck = (test) => {
    let result = [];
    const today = new Date();
    test.forEach((values, keys)=>{
        if(new Date(values.due) < new Date(today.getFullYear(),today.getMonth(),today.getDate()) && (values.completed == "" || values.completed == false) && values.progress != "100%"){
            let users = values.users.map((user)=>{
                return {
                    user_id : user ? user.user_id : undefined,
                    id: user ? user.id : undefined,
                    name: user ? user.name : undefined,
                    email: user ? user.email : undefined
                }
            });
            result = [...result, {
                id: values.id,
                name: values.name,
                users : users 
            }];
        }
    });
    return result;
}

const checkEH_AH = (taskIDs, test) => {
    let result = [];
    for(let i = 0; i < taskIDs.length ; i++){
        const data = test.get(taskIDs[i]);
        if(data.estimated_hours == "" || data.actual_hours == ""){
            result = [...result, { id: data.id, name : data.name}];
        }
    }
    return result;
}

const descriptionCheck = (taskIDs, test) => {
    let result = [];
    for(let i = 0; i < taskIDs.length ; i++){
        const data = test.get(taskIDs[i]);
        if(data.notes.length < 5){
            result = [...result, { id: data.id, name : data.name}];
        }
    }
    return result;
}

const checkSubtasksDate = (subtasksIDs, test) =>{
    let result = [];
    for(let i = 0; i < subtasksIDs.length; i++){
        const timeResult = checkSuccessorTime(subtasksIDs[i], test);
        if(!timeResult.status){
            result = [...result, ...timeResult];
        }   
    }
    return result;
}

const checkErrors = (test) => {
    // get subtasks object
    let subtasks = [...test.values()];

    // get subtasks ID
    let subtasksIDs = [...test.keys()];
    let result = {};
    let result1 = checkForSubtaskandDependency(test);
    let result2 = checkSubtasksDate(subtasksIDs, test);
    
    result.hanging = result1;
    result.time = result2;
    return result;
}

const checkWarnings = (test) => {
    let result = {};
    let assignee = checkAssignees(test);
    let overdue = overduecheck(test);
    let subtasksIDs = [...test.keys()];
    let estimate_actual_hours = checkEH_AH(subtasksIDs, test);
    let description = descriptionCheck(subtasksIDs, test);
    result.assignee = assignee;
    result.overdue = overdue;
    result.estimate_actual_hours = estimate_actual_hours;
    result.description = description;
    return result;
}

const checkTaskType = (custom_fields) => {
    if(isEmpty(custom_fields)){
        return "work";
    }
    else{
        let value = custom_fields["7m4cTikwf0A9Cjsa4nEX"]
        switch(value){
            case 4 :    return "rework" ;
                        break;         
            case 5 :    return "learn";
                        break;
            case 6 :    return "external" ;
                        break;
            case 7 :    return "spec change";
                        break;
            default :   return "work";
                        break; 
        }
    }
}

const checkOnCp = (custom_fields) => {
    if(isEmpty(custom_fields)){
        return false;
    }else{
        let value = custom_fields["nhPHaq7UMPYo5v50L4LE"];
        switch(value){
            case undefined :    return true;
                                break;
            case 2 :    return false;
                        break;
            case 1 :    return true;
                        break;
        }
    }
}

const isEmpty = (obj) => {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop))
        return false;
    }
    return true;
}

exports.check_Errors_Warnings = check_Errors_Warnings;