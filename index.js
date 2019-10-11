const express = require('express')
const syncRequest = require('sync-request')
const bodyParser = require('body-parser')
const log4js = require('log4js');
const https = require('https');
const fs = require('fs');

log4js.configure({
  appenders: { log: { type: 'file', filename: 'E:\\Applications\\NodeWebhook\\Logs\\log.log', maxLogSize: 2097152, backups: 50, keepFileExt: true } },
  categories: { default: { appenders: ['log'], level: 'debug' } }
});
const logger = log4js.getLogger();

const app = express()
app.use(bodyParser.json())

app.get('/', (req, res) => res.send('url should end with webhook!'))

app.get('/webhook', function(req, res){
  logger.debug('get request received at /webhook');
  res.send('POST request is allowed')
})

//app.listen(3000, () => console.log('Example app listening on port 3000!'))
https.createServer({
	key: fs.readFileSync('./key.pem'),
	cert: fs.readFileSync('./cert.pem'),
	passphrase: 'abcd'
},app).listen(3000, () => console.log('Https app listening on port 3000!'));

const REQUIRE_AUTH = true
const AUTH_TOKEN = '888123123'
var INTENT_NAME = "";
var lineUserId  = "";
var LOGIN_ID = "";
var PASSWORD = "";
var webhookReply = "";
var SESSIONID_FOR_WEBCHAT = "";
var Source = "";


//const PortalService_URL = "http://66.228.117.22/BotWebhookService/api/operations/";
const PortalService_URL = "http://169.50.64.42/BotWebhookService/api/operations/";

app.post('/webhook', function (req, res) {
  logger.debug('===============post request received===============')
  logger.debug(req.body)

  INTENT_NAME = req.body.result.metadata.intentName;
  LOGIN_ID = req.body.result.parameters['login_id'];
  PASSWORD = req.body.result.parameters['password'];
  SESSIONID_FOR_WEBCHAT = req.body.sessionId;

  logger.debug('intent name: ' + INTENT_NAME)
  logger.debug('login id: ' + LOGIN_ID)
  logger.debug('password: ' + PASSWORD)
  logger.debug('sessionid: ' + SESSIONID_FOR_WEBCHAT)

  if (REQUIRE_AUTH) {
    if (req.headers['auth-token'] !== AUTH_TOKEN) {
      logger.debug('AUTH_TOKEN is not authorized');
      return res.status(401).send('Unauthorized')
    }
  }

  if (!req.body || !req.body.result || !req.body.result.parameters) {
    logger.debug('validation failed');
    return res.status(400).send('Bad Request')
  }

  //webchat
  if(!req.body.originalRequest){
    Source = "webchat";
    logger.debug('Inside webchat condition');
    logger.debug('Source is :' + req.body.result.source);
    logger.debug('Calling Portal service.....');
    logger.debug(PortalService_URL);

    var resSR = syncRequest('POST',  
    PortalService_URL, 
    {
    	  json:{"OperationId":"5",
              "UserId":"",
              "Password":"",
              "LineId":"",
              "ActionId":2,
              "ReturnType":"str",
              "IntentKey":INTENT_NAME,
              "Source":Source,
              "Data":SESSIONID_FOR_WEBCHAT}
    });

    logger.debug('Response received');

    var json = resSR.getBody('utf8');
    webhookReply = json;

    logger.debug("response from Portal: " + json);

    res.status(200).json({
        	source: 'webhook',
        	speech: webhookReply,
        	displayText: webhookReply
    })
  }

  
  //line,twilio
  else{
    logger.debug('Inside line,twilio condition');
    logger.debug('Source is :' + req.body.originalRequest.source);
    
    if(req.body.originalRequest.source == "line"){
      Source = "line";
      if(!req.body.originalRequest.data.data){
        lineUserId = req.body.originalRequest.data.source.userId;
      }
      else{
        lineUserId = req.body.originalRequest.data.data.source.userId;
      }
    }
    else if(req.body.originalRequest.source == "twilio"){
	Source = "whatsapp";
      	lineUserId = req.body.originalRequest.data.From.replace('whatsapp:','');
    }

    logger.debug('UserId :' + lineUserId);
    logger.debug(req.body.originalRequest.data);
    logger.debug('Calling Portal service.....');    
    logger.debug(PortalService_URL);

    //1. CALL TO PORTAL FOR AUTHENTICATION AND AUTHORIZATION SERVICE AND GET USER PROFILE (CLIENTID)
    var resSR = syncRequest('POST', 
    PortalService_URL, 
    {
    	  json:{"OperationId":"5",
              "UserId":LOGIN_ID,
              "Password":PASSWORD,
              "LineId":lineUserId,
              "ActionId":2,
              "ReturnType":"str",
              "IntentKey":INTENT_NAME,
              "Source":Source,
              "Data":""}
      });

    logger.debug('Response received');

    var json = resSR.getBody('utf8')
    webhookReply = json;

    logger.debug("response from Portal: " + json);
    
    res.status(200).json({
        	source: 'webhook',
        	speech: webhookReply,
        	displayText: webhookReply
    })

    //logger.debug('response of portal service: ' + json);
    //if(res.statusCode == 200){
    //  res.status(200).json({
    //    	source: 'webhook',
    //    	speech: webhookReply,
    //    	displayText: webhookReply
    //  })
    //}
    //else{
    //  res.status(response.statusCode).json({
    //      source: 'webhook',
    //      speech: 'Error from b2b service:' + error,
    //      displayText: 'Error from b2b service:' + error
    //  })
    //}
  }

  logger.debug('===============post request finished===============')
})
