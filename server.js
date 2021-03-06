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
	console.log('On method signIn /profileData')
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
	console.log('On method POST signUp')
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
			restaurantes: []
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
	console.log('On method post forgotPassword')
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
	console.log('On method post /profileData')
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
	console.log('On method put /profileData')
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

app.post('/userReview', (req, res) => {
	console.log('On method post /userReview')
	const data = req.body;
	let restaurante = findRestaurantByName(data.restaurant.name);

	let prato = {}

	try {

		console.log(restaurante)
		if(restaurante.pratos)
		{
			for(let i = 0; i < restaurante.pratos.length; i++)
			{
				prato = restaurante.pratos[i];
				if(prato.nome === data.dish)
				{
					break;
				}
			}
		}

	}

	catch(e)
	{
		res.json({success: false})
	}

	Object.assign(prato, 
	{
		note: data.note,
		color: data.color,
		taste: data.taste,
		smell: data.smell,
		texture: data.texture,
		temperature: data.temperature,
		general: data.general
	})

	fs.writeFileSync('accounts.json', JSON.stringify(contas, null, 2))
	res.json({success: true})
})

app.get('/dishesData', (req, res) => {
	console.log('On method GET /dishesData')
	const token = req.headers['x-access-token']
	if(!token) return res.status(401).json({ auth: false, message: 'No token provided.' });	
})

app.get('/allRestaurants', (req, res) => {
	console.log('On method GET /allRestaurants')
	const restaurantes = [];
	contas.forEach(conta => {
		conta.restaurantes.forEach(restaurante => {
			let dishes = []
			if(restaurante.pratos) {
				dishes = restaurante.pratos.map(prato => {
					return prato.nome;
				})
			}
			restaurantes.push({
				name: restaurante.name, dishes
			});
		})
	})
	console.log(restaurantes)
	res.status(201).json(restaurantes)
})

app.get('/restaurants', (req, res) => {
	console.log('On method GET restaurants')
	const token = req.headers['x-access-token']
	if(!token) return res.status(401).json({ auth: false, message: 'No token provided.' });	

})

app.post('/restaurant', (req, res) => {
	console.log('On POST restaurant')
	const token = req.headers['x-access-token']
	if(!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
	console.log(req.body)
	const account = retrieveUser(token);
	console.log(account)
	const restaurants = account.restaurantes;
	restaurants.push(req.body);

	console.log(restaurants)
	console.log(contas)

	fs.writeFileSync('accounts.json', JSON.stringify(contas, null, 2))
	res.json({message: "Restaurante criado com sucesso!"})
})

app.listen(port, () => {
	console.log(`App is running on port ${port} at ${(new Date()).toLocaleString()}`);
});

function retrieveUser(token) {
	console.log('on retrieve user')
	const {email, password} = parseToken(token);
	console.log('Email e senha: ' + email + ", " + password)
	let account = undefined;

	contas.forEach(conta => {
		if(conta.email === email && conta.senha === password)
		{
			console.log('Cheguei aqui')
			account = conta;
		}
	})

	console.log(account)

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

function findRestaurantByName(name) {
	let restaurante = {}
	for(let i = 0; i < contas.length; i++)
	{
		const restaurantes = contas[i].restaurantes;
		if(restaurantes)
		{
			for(let j = 0; j < restaurantes.length; j++)
			{
				restaurante = restaurantes[j]
				if(restaurante.name === name)
				{
					return restaurante;
				}
			}
		}
	}
}