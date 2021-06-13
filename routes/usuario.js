const express 		= require('express')
const router 		= express.Router()
const mongoose 		= require('mongoose')
require('../models/Usuario')
const {isLogged} 	= require('../helpers/isLogged')
const Usuario 		= mongoose.model('usuarios')
const bcrypt 		= require('bcryptjs')
const passport 		= require('passport')
const { route } = require('./admin')

router.get('/registro', (req, res) => {
	res.render('usuarios/registro')
})

router.post('/registro', (req, res) => {
	let erros = []

	if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
		erros.push({texto: 'Nome inválido.'})
	}

	if(!req.body.email || typeof req.body.email == undefined || req.body.email == null){
		erros.push({texto: 'E-mail inválido.'})
	}

	if(!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null){
		erros.push({texto: 'Senha inválida.'})
	}

	if(req.body.senha.length < 4){
		erros.push({texto: 'A senha é muito curta!'})
	}

	if(req.body.senha != req.body.senha2){
		erros.push({texto: 'As senhas não batem!'})
	}

	if(erros.length > 0){
		res.render('usuarios/registro', {erros: erros})
	} else {
		Usuario.findOne({email: req.body.email}).then((usuario) => {
			if (usuario){
				req.flash('error_message', 'Já existe uma conta com este e-mail.')
				res.redirect('/usuarios/registro')
			} else{
				const novoUsuario = new Usuario({
					nome: req.body.nome,
					email: req.body.email,
					senha: req.body.senha
				})

				bcrypt.genSalt(12, (error, salt) => {
					bcrypt.hash(novoUsuario.senha, salt, (erro, hash) => {
						if (erro){
							req.flash('error_message', 'Houve um erro ao salvar o usuário.')
							res.redirect('/')
						}

						novoUsuario.senha = hash
						novoUsuario.save().then(() => {
							req.flash('success_message', 'Usuário criado com sucesso!')
							res.redirect('/')
						}).catch((error) => {
							req.flash('error_message', 'Houve um erro ao criar o usuário! Tente novamente mais tarde.')
							res.redirect('/usuarios/registro')
						})
					})
				})
			}
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno!')
			res.redirect('/')
		})
	}
})

router.get('/login', (req, res) => {
	res.render('usuarios/login')
})

router.post('/login', (req, res, next) => {
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/usuarios/login',
		failureFlash: true
	})(req, res, next)
})

router.get('/settings', isLogged, (req, res) => {
	res.render('usuarios/settings')
})

router.post('/changePassword', isLogged, (req, res, next) => {
	Usuario.findOne({email: req.user.email}).select('+senha').then((usuario) => {
		bcrypt.compare(req.body.senha, usuario.senha, (error, success) => {
			if (success) {
				bcrypt.genSalt(12, (error, salt) => {
					bcrypt.hash(req.body.senhaNova, salt, (erro, hash) => {
						if (erro){
							req.flash('error_message', 'Houve um erro ao alterar a senha.')
							res.redirect('/usuarios/settings')
						}

						usuario.senha = hash
						usuario.save().then(() => {
							req.flash('success_message', 'Senha alterada com sucesso!')
							res.redirect('/')
						}).catch((error) => {
							req.flash('error_message', 'Houve um erro ao processar o usuário! Tente novamente mais tarde.')
							res.redirect('/usuarios/settings')
						})
					})
				})
			} else {
				req.flash('error_message', 'Senha incorreta.')
				res.redirect('/usuarios/settings')
			}
		})
	})
})

router.post('/changeEmail', isLogged, (req, res, next) => {
	// vai ser usado para enviar e-mails mais tarde.
	Usuario.findOne({email: req.user.email}).select('+senha').then((usuario) => {
		bcrypt.compare(req.body.senha, usuario.senha, (error, success) => {
			if (success) {
				Usuario.findOne({email: req.body.novoEmail}).then((usuario_n) => {
					if (usuario_n) {
						req.flash('error_message', 'Este e-mail já está sendo usado.')
						res.redirect('/usuarios/settings')
					}

					usuario.email = req.body.novoEmail

					usuario.save().then(() => {
						req.flash('success_message', 'E-mail alterado com sucesso!')
						res.redirect('/usuarios/settings')
					}).catch((error) => {
						req.flash('error_message', 'Houve um erro interno ao alterar o e-mail. Tente novamente mais tarde.')
						res.redirect('/usuarios/settings')
					})
				}).catch((error) => {
					req.flash('error_message', 'Houve um erro interno ao verificar o e-mail. Tente novamente mais tarde.')
					res.redirect('/usuarios/settings')
				})
			} else {
				req.flash('error_message', 'Senha incorreta.')
				res.redirect('/usuarios/settings')
			}
		})
	})
})

router.post('/changeNotifications', isLogged, (req, res, next) => {
	let novosPosts = req.body.novosPosts
	let alteracaoSenha = req.body.alteracaoSenha

	Usuario.findOne({email: req.user.email}).then((usuario) => {
		if (novosPosts === 'on'){
			usuario.notify.novosPosts = 'true'
		} else {
			usuario.notify.novosPosts = 'false'
		}

		if (alteracaoSenha === 'on') {
			usuario.notify.alteracaoSenha = 'true'
		} else {
			usuario.notify.alteracaoSenha = 'false'
		}

		usuario.save().then(() => {
			req.flash('success_message', 'Alterações salvas.')
			res.redirect('/usuarios/settings')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro ao salvar as alterações. Tente novamente mais tarde.')
			res.redirect('/usuarios/settings')
		})
	})
})

router.get('/logout', isLogged, (req, res) => {
	req.logout()
	req.flash('success_message', 'Deslogado com sucesso.')
	res.redirect('/')
})

module.exports 		= router