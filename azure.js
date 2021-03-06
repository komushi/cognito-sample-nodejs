/*
Copyright 2014 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

*/


//Required modules and libraries
var express = require('express');
var path = require('path');
var passport = require('passport');
var session = require('express-session');
var bodyParser = require('body-parser');

var util = require('util');
var AWS = require('aws-sdk');
var config = require('./config-azure');
var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;


var AWS_ACCOUNT_ID = '042083552617';
var AWS_REGION = 'ap-northeast-1';
var COGNITO_IDENTITY_POOL_ID = 'ap-northeast-1:01f21590-5412-4d3f-b04b-99e63a22ff82';
var IAM_ROLE_ARN = 'arn:aws:iam::042083552617:role/Cognito_cognito_sample_nodejsAuth_Role';
var COGNITO_DATASET_NAME = 'GAME';
var COGNITO_KEY_NAME = 'LIFE';

//Declaration of variables for the app
var cognitosync;
var THE_TITLE = "Cognito Sample App Node.js - Identity Provider Azure AD";


//Passport serialization
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


//Using the AzureAD strategy to "Login with Amazon"
passport.use(new OIDCStrategy({
    identityMetadata: config.creds.identityMetadata,
    clientID: config.creds.clientID,
    responseType: config.creds.responseType,
    responseMode: config.creds.responseMode,
    redirectUrl: config.creds.redirectUrl,
    allowHttpForRedirectUrl: config.creds.allowHttpForRedirectUrl,
    clientSecret: config.creds.clientSecret,
    validateIssuer: config.creds.validateIssuer,
    // isB2C: config.creds.isB2C,
    issuer: config.creds.issuer,
    passReqToCallback: config.creds.passReqToCallback,
    scope: config.creds.scope,
    loggingLevel: config.creds.loggingLevel,
    nonceLifetime: config.creds.nonceLifetime,
  },
  function(iss, sub, profile, accessToken, refreshToken, params, done) {

// console.log("profile:");
// console.log(profile);
// console.log("profile end");

// console.log("refreshToken:");
// console.log(refreshToken);
// console.log("refreshToken end");

// console.log("accessToken:");
// console.log(accessToken);
// console.log("accessToken end");

// console.log("params:");
// console.log(params);
// console.log("params end");

    if (!profile.oid) {
      return done(new Error("No oid found"), null);
    }
    else if (!params) {
      return done(new Error("No authInfo found"), null);
    }
    else if (!params.id_token) {
      return done(new Error("No id_token found"), null);
    }
    else if (!params.access_token) {
      return done(new Error("No access_token found"), null);
    }
    else {
        process.nextTick(function() {
            return done(null, profile, params);
        });
    }
  }
));

//Initialize express
var app = express();

// setup of the app (view,assets,cookies,...)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'foo',resave: true,saveUninitialized: true,cookie: {expires: false}}));

app.use(bodyParser.urlencoded({ extended : true }));

//Initialization of passport
app.use(passport.initialize());
app.use(passport.session());


//GET Home Page
app.get('/', function(req, res) {
  //Configure the SDK
  AWS.config.region = AWS_REGION;
  res.render('index', {
        title: THE_TITLE
    });
});

//GET Logout Page
app.get('/logout', function(req, res) {
    req.logout();
    // res.redirect('/');
    res.redirect(config.destroySessionUrl);
});



/* GET Amazon page for authentication. */
app.get('/auth/amazon',
    passport.authenticate('azuread-openidconnect', {
        scope: ['profile']
    }),
    function(req, res) {
        // The request will be redirected to Amazon for authentication, so this
        // function will not be called.
});


/* GET Amazon callback page. */
app.get('/auth/amazon/callback', passport.authenticate('azuread-openidconnect', {
        failureRedirect: '/null'
    }),
    function(req, res) {
        res.redirect('/showData');
});

/* POST Amazon callback page. */
app.post('/auth/amazon/callback', passport.authenticate('azuread-openidconnect', {
        failureRedirect: '/'
    }),
    function(req, res) {
        req.user.authInfo = req.authInfo;

        res.redirect('/showData');
});

//GET ShowData page
//This page initialize the CognitoId and the Cognito client, then list the data contained in the Cognito dataset
app.get('/showData', ensureAuthenticated, function(req, res) {
    var params = {
      AccountId: AWS_ACCOUNT_ID, 
      RoleArn: IAM_ROLE_ARN, 
      IdentityPoolId: COGNITO_IDENTITY_POOL_ID, 
      Logins: {
          'login.microsoftonline.com/08e11fc0-5629-40d0-9937-34607c39001c/v2.0': req.user.authInfo.id_token
          // 'login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0': req.user.token
          // 'login.microsoftonline.com/cloudnativeltd.onmicrosoft.com/v2.0': req.user.token
      }
    };
    
    // initialize the Credentials object
    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

    // Get the credentials for our user
    AWS.config.credentials.get(function(err) {
        if (err) console.log("## credentials.get: ".red + err, err.stack); // an error occurred
        else {

            req.user.COGNITO_IDENTITY_ID = AWS.config.credentials.identityId;

            // Other AWS SDKs will automatically use the Cognito Credentials provider
            // configured in the JavaScript SDK.
            cognitosync = new AWS.CognitoSync();
            cognitosync.listRecords({
                DatasetName: COGNITO_DATASET_NAME, // required
                IdentityId: req.user.COGNITO_IDENTITY_ID, // required
                IdentityPoolId: COGNITO_IDENTITY_POOL_ID // required
            }, function(err, data) {

                if (err) console.log("## listRecords: ".red + err, err.stack); // an error occurred
                else {
                    //Retrieve dataset metadata and SyncSessionToken for subsequent calls
                    req.user.COGNITO_SYNC_TOKEN = data.SyncSessionToken;
                    req.user.COGNITO_SYNC_COUNT = data.DatasetSyncCount;

                    //Check the existence of the key in the dataset
                    if (data.Count != "0") req.user.CURRENT_LIFE = data.Records[0].Value;
                    else req.user.CURRENT_LIFE = "0";

                    //Retrieve information on the dataset
                    var dataRecords = JSON.stringify(data.Records);

                    res.render('index', {
                        title: THE_TITLE,
                        gaugeValue: req.user.CURRENT_LIFE,
                        records: dataRecords,
                        name: req.user.displayName,
                        email: req.user._json.email,
                        displayButtons: req.user,
                        cognitoId: req.user.COGNITO_IDENTITY_ID
                    });
                }
            });
        }
    });
});


// GET /modifyLife 
//This funtion will add or substract a certain amount of points of life in the gauge
//The amount is passed in the URL (positive or negative)
app.get('/modifyLife',ensureAuthenticated, function(req, res, next) {
    //Retrieve points from the URL parameter
    var points = parseInt(req.query.points);
    //Call to List Records in order to retrieve a new sync session token
    cognitosync.listRecords({
        DatasetName: COGNITO_DATASET_NAME, 
        IdentityId: req.user.COGNITO_IDENTITY_ID, 
        IdentityPoolId: COGNITO_IDENTITY_POOL_ID 
    }, function(err, data) {

        if (err) console.log("## listRecords: ".red + err, err.stack); // an error occurred
        else {
            //Retrieve dataset metadata and SyncSessionToken for subsequent calls
            req.user.COGNITO_SYNC_TOKEN = data.SyncSessionToken;
            req.user.COGNITO_SYNC_COUNT = data.DatasetSyncCount;

            //Compute current life, enforce a scale from 0 to 100 for the gauge
            req.user.CURRENT_LIFE = (parseInt(req.user.CURRENT_LIFE) + points).toString();
            if (parseInt(req.user.CURRENT_LIFE) < 0) req.user.CURRENT_LIFE="0";
            else if (parseInt(req.user.CURRENT_LIFE) > 100) req.user.CURRENT_LIFE="100";

            //Parameters for updating the dataset
            var params = {
                DatasetName: COGNITO_DATASET_NAME, 
                IdentityId: req.user.COGNITO_IDENTITY_ID, 
                IdentityPoolId: COGNITO_IDENTITY_POOL_ID, 
                SyncSessionToken: req.user.COGNITO_SYNC_TOKEN, 
                RecordPatches: [{
                    Key: COGNITO_KEY_NAME, 
                    Op: 'replace', 
                    SyncCount: req.user.COGNITO_SYNC_COUNT, 
                    Value: req.user.CURRENT_LIFE
                }]
            };

            //Make the call to Amazon Cognito
            cognitosync.updateRecords(params, function(err, data) {
                if (err) {
                    console.log("## updateRecords: ".red + err, err.stack);
                } // an error occurred
                else {
                    var dataRecords = JSON.stringify(data);
                    //render the page
                    res.render('index', {
                        title: THE_TITLE,
                        gaugeValue: req.user.CURRENT_LIFE,
                        records: dataRecords,
                        name: req.user.displayName,
                        email: req.user._json.email,
                        displayButtons: req.user,
                        cognitoId: req.user.COGNITO_IDENTITY_ID
                    });
                }
            });

        }
    });
});



// / catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler, Stacktrace is displayed
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});


//Simple route middleware to ensure user is authenticated. Use this route middleware on any resource that needs to be protected.
//If the request is authenticated (via a persistent login session),
//the request will proceed.  Otherwise, the user will be redirected to the home page for login.
function ensureAuthenticated(req, res, next) {
// console.log("ensureAuthenticated111111");
// console.log("req.user");
// console.log(req.user);
// console.log("req.user end");
// console.log("req.authInfo");
// console.log(req.authInfo);
// console.log("req.authInfo end");

  if (req.isAuthenticated()) { 
    // console.log("ensureAuthenticated333333");
    return next(); 
  }
// console.log("ensureAuthenticated222222");
  res.redirect('/')
}

//Set the port of the app
app.set('port', process.env.PORT || 8080);

//Launch the express server
var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});