const mongoose	= require('mongoose')
const Schema 	= mongoose.Schema

const Usuario = new Schema({
	nome: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	role: {
		type: Number,
		default: 0
	},
	notify: {
		novosPosts: {type: Boolean, default: 1},
		alteracaoSenha: {type: Boolean, default: 1}
	},
	senha: {
		type: String,
		required: true,
		select: false
	},
	banido: {
		type: Boolean,
		default: 0
	}
}, {
	toObject: {
		virtuals: true,
	},
	timestamps: true
})

mongoose.model('usuarios', Usuario)