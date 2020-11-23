const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {ADMIN_EMAIL} = require('./constants.js')

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const TOKEN_PATH = 'token.json';

class MailSender {
	constructor() {
		this.oAuth2Client =	null;

		console.log('Creating object of MailSender')
		// Load client secrets from a local file.
		fs.readFile('credentials.json', (err, content) => {
		  if (err) return console.log('Error loading client secret file:', err);
		  // Authorize a client with credentials, then call the Gmail API.
		  this.authorize(JSON.parse(content));
		});
	}

	authorize(credentials) {
  		const {client_secret, client_id, redirect_uris} = credentials.installed;
 	    this.oAuth2Client = new google.auth.OAuth2(
      		client_id, client_secret, redirect_uris[0]);

		  // Check if we have previously stored a token.
  		fs.readFile(TOKEN_PATH, (err, token) => {
    		if (err) return this.getNewToken(oAuth2Client, callback);
			this.oAuth2Client.setCredentials(JSON.parse(token));
			console.log('Admin autenticated!')
  		});
	}

	getNewToken(oAuth2Client, callback) {
	  const authUrl = oAuth2Client.generateAuthUrl({
	    access_type: 'offline',
	    scope: SCOPES,
	  });
	  console.log('Authorize this app by visiting this url:', authUrl);
	  const rl = readline.createInterface({
	    input: process.stdin,
	    output: process.stdout,
	  });
	  rl.question('Enter the code from that page here: ', (code) => {
	    rl.close();
	    oAuth2Client.getToken(code, (err, token) => {
	      if (err) return console.error('Error retrieving access token', err);
	      oAuth2Client.setCredentials(token);
	      // Store the token to disk for later program executions
	      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
	        if (err) return console.error(err);
	        console.log('Token stored to', TOKEN_PATH);
	      });
	      callback(oAuth2Client);
	    });
	  });
	}

	makeBody(to, from, subject, message) {
	    const str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
	        "MIME-Version: 1.0\n",
	        "Content-Transfer-Encoding: 7bit\n",
	        "to: ", to, "\n",
	        "from: ", from, "\n",
	        "subject: ", subject, "\n\n",
	        message
	    ].join('');

	    return Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
	}

	sendEmail = (userInfo) => {
		const gmail = google.gmail({version: 'v1', auth: this.oAuth2Client});
		console.log(userInfo)
		const raw = this.makeBody(userInfo.email, ADMIN_EMAIL, 'RMH: Recuperacao de Senha', `Olá ${userInfo.name}\nVocê solicitou a recuperação de senha, seus dados são:\nEmail: ${userInfo.email}\nSenha: ${userInfo.senha}\n\nEnviado automaticamente por sistema Restaurant Manager Helper - RMH\nPor favor não responda esse email`);
		gmail.users.messages.send({
			auth: this.oAuth2Client,
			userId: 'me',
			resource: {
				raw
			}
		}, (err, res) => {
			if (err) {
				console.log('The API returned an error: ' + err);
				return false;
			}
			console.log(res);
			return true;
		});
	}
}

module.exports = MailSender;