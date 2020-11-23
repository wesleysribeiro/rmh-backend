const express = require('express')
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser')
const fs = require('fs');
const emailApi = require('./emailApi.js')

const EmailSender = new emailApi();

app.use(cors())
app.use(bodyParser.json())

let contas = []

fs.readFile('accounts.json', (err, data) => {
	if(data.length > 0)
		contas = JSON.parse(data)
})	

const port = 3003

app.post('/signIn', (req, res) => {
	const loginData = req.body;

	console.log(loginData)

	let result = false;
	let authToken = ""

	contas.forEach((conta) => {
		if(conta.email === loginData.email && conta.senha === loginData.password)
		{
			console.log('Conta encontrada!')
			authToken = Buffer.from(conta.email + ';' + conta.senha).toString('base64');
			result = true;	
		}
	})
	res.json({token: authToken, result: result})
})

app.post('/signUp', (req, res) => {
	const registerData = req.body;

	console.log('Recebido um request com: ')
	console.log(registerData)

	let message = 'Erro desconhecido ao criar conta!'

	// Conta não foi registrada ainda
	let success = contas.every((currValue) => {
		message = 'O email já está registrado no banco de dados!';
		return currValue.email != registerData.email;
	})

	if(success) {
		contas.push({
			email: registerData.email,
			nome: registerData.name,
			senha: registerData.password,
			dataNascimento: registerData.birthdate,
			cpf: registerData.CPF,
			restaurantes = []
		})
		try {
			fs.writeFileSync('accounts.json', JSON.stringify(contas, null, 2))
			success = true;
			message = "Conta criada com sucesso!";
		}
		catch(e)
		{
			success = false;
		}
	}

	res.json({message: message , result: success})
})

app.post('/forgotPassword', (req, res) => {
	let msg = ""
	let success = false;
	console.log('Dados recebidos: ')
	console.log(req.body)

	contas.forEach(conta => {
		console.log(conta)
		if(conta.email === req.body.email)
		{
			EmailSender.sendEmail({email: req.body.email, name: conta.nome, senha: conta.senha});
			success = true;
		}
	})

	msg = success ? `Um email foi enviado para ${req.body.email}, verifique sua caixa de mensagens!` :
                    "Email não cadastrado na base de dados!"

	res.json({message: msg, success})
})

app.post('/profileData', (req, res) => {
	console.log(req.body)
	const authCode = req.body.token;

	const {email, password} = parseToken(authCode);

	console.log(email)
	console.log(password)

	let data = {}

	contas.forEach(conta => {
		if(conta.email === email && conta.senha === password)
		{
			data = {
				name: conta.nome,
				cpf: conta.cpf,
				birthdate: conta.dataNascimento
			}
		}
	})

	console.log('Sending data back: ')
	console.log(data)
	res.json(data);
})

app.put('/profileData', (req, res) => {
	console.log(req.body)
	const authCode = req.body.token;
	const formData = req.body.form;

	const {email, password} = parseToken(authCode);

	console.log(email)
	console.log(password)

	let message = "Um erro inesperado ocorreu!"

	contas.forEach(conta => {
		if(conta.email === email && conta.senha === password)
		{
			conta.nome = formData.nome;
			conta.cpf = formData.cpf;
			conta.dataNascimento = formData.dataNasc;

			fs.writeFileSync('accounts.json', JSON.stringify(contas, null, 2))
			message = "Conta atualizada com sucesso!"
		}
	})

	res.json({message: "Conta atualizada com sucesso!"})

})

app.get('/dishesData', (req, res) => {
	const token = req.headers['x-access-token']
	if(!token) return res.status(401).json({ auth: false, message: 'No token provided.' });	
	//TODO
})

app.get('/restaurants', (req, res) => {
	const token = req.headers['x-access-token']
	if(!token) return res.status(401).json({ auth: false, message: 'No token provided.' });	
	// TODO
})

app.post('/restaurant', (req, res) => {
	const token = req.headers['x-access-token']
	if(!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
	// TODO
})

app.listen(port, () => {
	console.log(`App is running on port ${port} at ${(new Date()).toLocaleString()}`);
});

function retrieveUser(token) {
	const {email, senha} = parseToken(token);
	let account = undefined;

	contas.forEach(conta => {
		if(conta.email === email && conta.senha === password)
		{
			account = conta;
		}
	})

	return account;
}

function parseToken(token) {
	const rawData = Buffer.from(token, 'base64').toString();

	const rawArray = rawData.split(';')
	const email = rawArray[0];
	const password = rawArray[1];

	return {
		email,
		password
	}
}