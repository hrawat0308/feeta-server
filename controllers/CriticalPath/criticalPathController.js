let mysql = require('../../Utils/dbConnection');
const criticalPathHelpers = require('./criticalPathHelpers');
 
const criticalPath = async (req, res, next) => {
    const project_id = req.query.project_id;
    const snapshot_date = req.query.snapshot_date;
    let tempConnection;
    let tasks; let milestones;
    try{
        tempConnection = await mysql.connection();
        let tasks_query = `SELECT gantt_chart.project_name, gantt_chart.project_uid, gantt_chart.is_milestone,
        gantt_chart.uid as task_id, dom.dpd_uid, gantt_chart.task_title, DATE_FORMAT(gantt_chart.start_date,"%Y-%m-%d") as start_date, 
        DATE_FORMAT(gantt_chart.end_date,"%Y-%m-%d") as end_date
        FROM gantt_chart  
        inner join depends_on_map dom on gantt_chart.uid = dom.gantt_uid
        and  gantt_chart.snapshot_date='${snapshot_date}' and dom.snapshot_date='${snapshot_date}'
        and gantt_chart.project_uid = '${project_id}' and is_parent is false and is_milestone is false order by start_date;
        `;
        let milestones_query = `SELECT gantt_chart.project_name, gantt_chart.project_uid, gantt_chart.is_milestone,
        gantt_chart.uid as task_id, dom.dpd_uid, gantt_chart.task_title, DATE_FORMAT(gantt_chart.start_date,"%Y-%m-%d") as start_date, 
        DATE_FORMAT(gantt_chart.end_date,"%Y-%m-%d") as end_date
        FROM gantt_chart  
        inner join depends_on_map dom on gantt_chart.uid = dom.gantt_uid
        and  gantt_chart.snapshot_date='${snapshot_date}' and dom.snapshot_date='${snapshot_date}'
        and gantt_chart.project_uid = '${project_id}' and is_parent is false and is_milestone is true order by start_date;
        `
        tasks = await tempConnection.query(tasks_query);
        milestones = await tempConnection.query(milestones_query);
        let graph;
        graph = criticalPathHelpers.create_graph(tasks, milestones);
        console.log(graph);
        let V = await tempConnection.query(`select COUNT(distinct uid) as vertices from gantt_chart where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}' and is_parent is false;`);
        V = V[0].vertices;
        let E = graph.length;
        let src = graph[0][0];
        const [path_days, path_array]  = criticalPathHelpers.Bellman(graph, V, E, src);
    
        let result;
        let onCPTasks = path_array.map(path => path);
        let onCPTasksNames = await tempConnection.query(`select task_title, uid from gantt_chart where uid in (?);`, [onCPTasks]);
        for(let i = 0; i < path_array.length; i++){
            let {task_title} = onCPTasksNames.find(task => task.uid === path_array[i]);
            result = i === 0 ? task_title : result + " -> " + task_title; 
        }
        let [{project_duration}] = await tempConnection.query(`select ABS(DATEDIFF(MAX(end_date),MIN(start_date))+1) as project_duration from gantt_chart 
        where project_uid = '${project_id}' and snapshot_date = '${snapshot_date}' and is_parent is false;`);        
        await tempConnection.releaseConnection();
        res.json({criticalPath: {
            path : result,
            slack : project_duration + path_days,
            project_duration: project_duration,
            path_days,
            path_array,
        }});
    }
    catch(error){
        await tempConnection.releaseConnection();
        console.log(error);
        return res.status(500).json({ status: 0, message: "SERVER_ERROR" }); 
    }
}

exports.criticalPath = criticalPath;