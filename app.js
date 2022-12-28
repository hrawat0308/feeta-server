const express = require("express");
require('dotenv').config();
const swaggerUI = require('swagger-ui-express');
const morgan = require('morgan');
const YAML = require('yamljs');
const swaggerJsDocs = YAML.load('./api.yaml');
let cors = require('cors');
const routes = require("./routes");

const app = express();

app.use(cors());
// app.use((req, res, next)=>{
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
//     next();
// });
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerJsDocs));
// app.use(morgan('combined'));

morgan.token('id', function getId(req) {
    return req.id
  });
  
  morgan.token('req', function (req) {
    return JSON.stringify(req.body);
  });
  
  let loggerFormat = 'Logger --  :id [:date[web]] ":method :url" :status :response-time :req ';
  
  app.use(morgan(loggerFormat, {
    skip: (req, res) => {
      return res.statusCode >= 400
    },
    stream: process.stdout
  }));
  
  app.use(morgan(loggerFormat, {
    skip: (req, res) => {
      return res.statusCode < 400
    },
    stream: process.stderr
  }));

app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
app.use('/api', routes);

app.listen(process.env.PORT, ()=>{
    console.log(`Server running on port ${process.env.PORT}`);
});