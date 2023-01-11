//** Helper Functions  for Critical Path Analysis **/

const create_distance_list_map = (graph) => {
    const distance_list = new Map();
    distance_list.set(graph[0][0], 0);
    distance_list.set(graph[graph.length-1][1], 10000);
    for(let i = 0; i < graph.length; i++){
        if(!distance_list.has(graph[i][1])){
            distance_list.set(graph[i][1], 10000);
        }
    }
    return distance_list;
}


const create_graph = (tasks, milestones) => {
    const graph = []; 
    for(let i = 0; i < tasks.length; i++){
        let predecessorStart = tasks.find((task)=> task.task_id === tasks[i].dpd_uid);
        if(!predecessorStart){
            predecessorStart = milestones.find((milestone)=> milestone.task_id === tasks[i].dpd_uid);
        } 
        let duration = diffDays(new Date(tasks[i].start_date) , new Date(predecessorStart.start_date));
        graph.push([predecessorStart.task_id, tasks[i].task_id, -duration]);
    }

    milestones = milestones.filter(milestone => milestone.dpd_uid !== '');
    for(let i = 0; i < milestones.length; i++){
        let predecessorStart = tasks.find(task => task.task_id === milestones[i].dpd_uid);
        if(!predecessorStart){
            predecessorStart = milestones.find(milestone => milestone.task_id === milestones[i].dpd_uid);
        }
        let duration = diffDays(new Date(milestones[i].start_date), new Date(predecessorStart.start_date));
        graph.push([predecessorStart.task_id, milestones[i].task_id, -duration]);
    }
    return graph;
}

const checkWeekends = (start_date, end_date)=>{
    let count = 0;
    let loop = new Date(start_date);
    while(loop <= end_date){
        //checking if it was a working day or not by comparing dates from working_day object from JSON payload
        if(!working_days[loop.getDay()]){
            count++;
        }
        let newDate = loop.setDate(loop.getDate()+1);
        loop = new Date(newDate);
    }
    return count;
}

const diffDays = (max_date, min_date)=>{
    const timeDiff = Math.abs(max_date - min_date);
    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    // const num_of_weekends = checkWeekends(min_date,max_date);
    // return dayDiff - num_of_weekends;
    return dayDiff;
}

const working_days = {
    "0": false,
    "1": true,
    "2": true,
    "3": true,
    "4": true,
    "5": true,
    "6": false
}

const Bellman = (graph, V, E, src) => {
    const dist = create_distance_list_map(graph);
    const path = new Map([
        [graph[0][0],[graph[0][0]]]
    ]);
    for (var i = 0; i < V - 1; i++)
    {
        for (var j = 0; j < E; j++)
        {
            if ((dist.get(graph[j][0]) + graph[j][2]) < dist.get(graph[j][1])){
                dist.set(graph[j][1], dist.get(graph[j][0]) + graph[j][2]);
                if(!path.has(graph[j][0])){
                    let pathstring = graph[j][0].toString()+"-"+graph[j][1].toString();
                    let arr = [pathstring];
                    path.set(graph[j][1], arr);
                }
                else{
                    let arr = path.get(graph[j][0]);
                    let latestPath = arr[arr.length-1];
                    path.set(graph[j][1], [latestPath+"-"+graph[j][1].toString()]);
                }
            }
        }
    }
    const path_array = path.get(graph[graph.length-1][1])[0].split("-");
    const path_days = dist.get(graph[graph.length-1][1]);
    return [path_days, path_array];
}


exports.Bellman = Bellman;
exports.create_graph = create_graph;
exports.diffDays = diffDays;