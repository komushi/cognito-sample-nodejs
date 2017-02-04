
exports.creds = {
  // Required
  identityMetadata: 'https://login.microsoftonline.com/cloudnativeltd.onmicrosoft.com/v2.0/.well-known/openid-configuration', 
  // identityMetadata: 'https://login.microsoftonline.com/08e11fc0-5629-40d0-9937-34607c39001c/v2.0/.well-known/openid-configuration', 
  //
  // or you can use the common endpoint
  // 'https://login.microsoftonline.com/common/.well-known/openid-configuration'
  // To use the common endpoint, you have to either set `validateIssuer` to false, or provide the `issuer` value.

  // Required, the client ID of your app in AAD  
  clientID: '06de52f7-bb02-4105-a0b6-59e1d8f0ae47',

  // Required, must be 'code', 'code id_token', 'id_token code' or 'id_token' 
  // responseType: 'code', 
  responseType: 'id_token', 

  // Required
  responseMode: 'form_post', 
  // responseMode: 'query', 

  // Required, the reply URL registered in AAD for your app
  redirectUrl: 'http://localhost:8080/auth/amazon/callback', 

  // Required if we use http for redirectUrl
  allowHttpForRedirectUrl: true,
  
  // Required if `responseType` is 'code', 'id_token code' or 'code id_token'. 
  // If app key contains '\', replace it with '\\'.
  clientSecret: null, 

  // Required to set to false if you don't want to validate issuer
  validateIssuer: false,

  // Required if you want to provide the issuer(s) you want to validate instead of using the issuer from metadata
  // issuer: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0',
  // issuer: 'https://login.microsoftonline.com/cloudnativeltd.onmicrosoft.com/v2.0',
  issuer: null,

  // Required to set to true if the `verify` function has 'req' as the first parameter
  passReqToCallback: false,

  // Optional. The additional scope you want besides 'openid', for example: ['email', 'profile'].
  scope: ['email','profile','openid'],

  // Optional, 'error', 'warn' or 'info'
  loggingLevel: 'info',

  // Optional. The lifetime of nonce in session, the default value is 3600 (seconds).
  nonceLifetime: null,
};

// The url you need to go to destroy the session with AAD
exports.destroySessionUrl = 'https://login.microsoftonline.com/cloudnativeltd.onmicrosoft.com/oauth2/logout?post_logout_redirect_uri=http://localhost:8080';
