const localStrategy 	= require('passport-local').Strategy
const mongoose 			= require('mongoose')
const bcrypt 			= require('bcryptjs')

//	Model de Usuário
require('../models/Usuario')
const Usuario 			= mongoose.model('usuarios')

module.exports = function(passport){
	passport.use(new localStrategy({usernameField: 'email', passwordField: 'senha'}, (email, senha, done) => {
		Usuario.findOne({email: email}).select('+senha').then((usuario) => {
			if (!usuario){
				return done(null, false, {message: 'Esta conta não existe.'})
			}

			if (usuario.banido) {
				return done(null, false, {message: 'Este e-mail foi banido.'})
			}

			bcrypt.compare(senha, usuario.senha, (error, success) => {
				if (success){
					return done(null, usuario)
				} else {
					return done(null, false, {message: 'Senha incorreta.'})
				}
			})
		})
	}))

	passport.serializeUser((usuario, done) => {
		done(null, usuario.id)
	})

	passport.deserializeUser((id, done) => {
		Usuario.findById(id, (error, usuario) => {
			done(error, usuario)
		})
	})
}