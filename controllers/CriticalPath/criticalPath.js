let mysql = require('../../Utils/dbConnection');
const criticalPathHelpers = require('./criticalPathHelpers'); 

const updateCriticalPath = async (req, res, next) => {
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    try{
        await criticalPath(project_id, snapshot_date);
    }
    catch(error){
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" }); 
    }
    
    res.json("updated");
}

//new algo, currently in use 
const criticalPath = async (project_id, snapshot_date) => {
    let tempConnection;
    let tasks;
    try{
        tempConnection = await mysql.connection();
        let tasks_query = `SELECT gantt_chart.project_name, gantt_chart.project_uid,  
        gantt_chart.uid as task_id, dom.dpd_uid, gantt_chart.task_title, DATE_FORMAT(gantt_chart.start_date,"%Y-%m-%d") as start_date, 
        DATE_FORMAT(gantt_chart.end_date,"%Y-%m-%d") as end_date
        FROM gantt_chart  
        inner join depends_on_map dom on gantt_chart.uid = dom.gantt_uid
        and  gantt_chart.snapshot_date='${snapshot_date}' and dom.snapshot_date='${snapshot_date}'
        and gantt_chart.project_uid = '${project_id}' and is_parent is false 
        and is_milestone is false order by start_date;
        `;
        let milestone_query = `SELECT gantt_chart.project_name, gantt_chart.project_uid,  
        gantt_chart.uid as task_id, dom.dpd_uid, gantt_chart.is_milestone,gantt_chart.task_title, DATE_FORMAT(gantt_chart.start_date,"%Y-%m-%d") as start_date, 
        DATE_FORMAT(gantt_chart.end_date,"%Y-%m-%d") as end_date
        FROM gantt_chart  
        inner join depends_on_map dom on gantt_chart.uid = dom.gantt_uid
        and  gantt_chart.snapshot_date='${snapshot_date}' and dom.snapshot_date='${snapshot_date}'
        and gantt_chart.project_uid = '${project_id}' and is_parent is false 
        and is_milestone is true order by start_date;
        `;
        tasks = await tempConnection.query(tasks_query);
        milestones = await tempConnection.query(milestone_query);
        let graph;
        graph = criticalPathHelpers.create_graph(tasks, milestones);
        console.log(graph);
        let V = await tempConnection.query(`select COUNT(distinct uid) as vertices from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}' and is_parent is false;`);
        V = V[0].vertices;
        let E = graph.length;
        let src = graph[0][0];
        const [path_days, path_array]  = criticalPathHelpers.Bellman(graph, V, E, src);
        
        //find all the task ID to set on CP as 0 
        let allTasks = await tempConnection.query(`select task_id from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}' order by start_date;`);
        allTasks = allTasks.map(task=>task.task_id);
        const setAllCPFalseResult = await tempConnection.query(`update gantt_chart set on_cp = 0 where task_id in (?);`, [allTasks]);
        
        //mark all the tasks in path array as on CP
        let onCPTasks = path_array.map(path => path);
        let onCPTaskIDs = await tempConnection.query(`select task_id from gantt_chart where uid in (?);`, [onCPTasks]);
        onCPTaskIDs = onCPTaskIDs.map(task=>task.task_id);
        const updatedOnCPResult = await tempConnection.query(`update gantt_chart set on_cp = 1 where task_id in (?);`, [onCPTaskIDs]);
        
        await tempConnection.releaseConnection();
        console.log("updated ON_CP");
    }
    catch(error){
        await tempConnection.releaseConnection();
        throw new Error(error);
    }
}


exports.updateCriticalPath = updateCriticalPath;
exports.criticalPath = criticalPath;