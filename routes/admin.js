const express	= require('express')
const router	= express.Router()
const mongoose 	= require('mongoose')
const {role} 	= require('../helpers/role')
const mailer 	= require('../modules/mailer')
const cheerio	= require('cheerio')

require('../models/Categoria')
require('../models/Postagem')
require('../models/Usuario')

const Categoria = mongoose.model('categorias')
const Usuario 	= mongoose.model('usuarios')
const Postagem	= mongoose.model('postagens')

const moment	= require('moment')
moment.locale('pt-br')

router.get('/', role, (req, res) => {
	res.render('admin/index')
})

router.get('/categorias', role, (req, res) => {
	Categoria.find().sort({date: 'desc'}).lean().then((categorias) => {
		res.render('admin/categorias', {categorias: categorias})
	}).catch((error) => {
		req.flash('error_message', 'Houve um error ao listar as categorias.')
		res.redirect('/admin')
	})
})

router.get('/categorias/add', role, (req, res) => {
	res.render('admin/addcategorias')
})

router.post('/categorias/nova', role, (req, res) => {
	let erros = []

	if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null){
		erros.push({texto: 'Nome inválido'})
	}

	if(!req.body.slug || typeof req.body.slug == undefined || req.body.slug == null){
		erros.push({texto: 'Slug inválido'})
	}

	if(req.body.nome.length <= 0){
		erros.push({texto: 'Nome da categoria é muito pequeno'})
	}

	if(erros.length > 0){
		res.render('admin/addcategorias', {erros: erros})
	} else {
		const novaCategoria = {
			nome: req.body.nome,
			slug: req.body.slug
		}

		new Categoria(novaCategoria).save().then(() => {
			req.flash('success_message', 'Categoria criada com sucesso!')
			res.redirect('/admin/categorias')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro ao salvar a categoria. Tente novamente.')
			res.redirect('/admin')
		})
	}
})

router.get('/categorias/edit/:id', role, (req, res) => {
	Categoria.findOne({_id:req.params.id}).lean().then((categoria) => {
		res.render('admin/editcategorias', {categoria: categoria})
	}).catch((error) => {
		req.flash('error_message', 'Esta categoria não existe.')
		res.redirect('/admin/categorias')
	})
})

router.post('/categorias/edit', role, (req, res) => {
	Categoria.findOne({_id: req.body.id}).then((categoria) => {
		categoria.nome = req.body.nome
		categoria.slug = req.body.slug

		categoria.save().then(() => {
			req.flash('success_message', 'Categoria editada com sucesso!')
			res.redirect('/admin/categorias')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno ao salvar a edição da categoria')
			res.redirect('/admin/categorias')
		})
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao editar a categoria')
		res.redirect('/admin/categorias')
	})
})

router.post('/categorias/deletar', role, (req, res) => {
	Categoria.deleteOne({_id: req.body.id}).then(() => {
		req.flash('success_message', 'Categoria deletada com sucesso!')
		res.redirect('/admin/categorias')
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao deletar categoria.')
		res.redirect('/admin/categorias')
	})
})

router.get('/postagens', role, (req, res) => {
	Postagem.find().lean().populate('categoria').sort({date: 'desc'}).then((postagens) => {
		res.render('admin/postagens', {postagens: postagens})
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao listar as postagens.')
		console.log(error)
		res.redirect('/admin')
	})	
})

router.get('/postagens/add', role, (req, res) => {
	Categoria.find().lean().then((categorias) => {
		res.render('admin/addpostagem', {
			categorias: categorias})
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao carregar o formulário.')
		res.redirect('/admin')
	})
})

router.post('/postagens/nova', role, (req, res) => {
	let erros = []

	if(req.body.categoria == '0'){
		erros.push({texto: 'Categoria inválida, registre uma nova categoria.'})
	}

	if(erros.length > 0){
		res.render('admin/addpostagem', {erros: erros})
	} else{
		const novaPostagem = {
			titulo: req.body.titulo,
			descricao: req.body.descricao,
			slug: req.body.slug,
			categoria: req.body.categoria,
			conteudo: req.body.conteudo
		}

		let conteudo = cheerio.load(req.body.conteudo)
		let primeiraImagem = conteudo('img')[0].attribs.src

		new Postagem(novaPostagem).save().then(() => {
			Usuario.find({'notify.novosPosts': "true"}).lean().then((usuarios) => {
				usuarios.forEach((usuario) => {
					if (usuario.notify.novosPosts) {
						let nome = usuario.nome
						let admin = req.user.nome
						let data = moment().format('ll')
						let blog = "Blog do Sam"
						let post = req.body.titulo
						let descricao = req.body.descricao
						let link = 'http://localhost:8080/postagem/' + req.body.slug
						let contaLink = 'http://localhost:8080/usuarios/settings'

						mailer.sendMail({
							to: usuario.email,
							from: 'sam@gmail.com',
							subject: 'Novo post: ' + post,
							template: 'new_post/notification',
							context: { data, nome, blog, primeiraImagem, post, descricao, link, admin, contaLink }
						}, (err) => {
							if (err)
								console.log('Não foi possível enviar e-mail de notificação: ' + err)
						})
					}
				})
			})

			req.flash('success_message', 'Postagem criada com sucesso!')
			res.redirect('/admin/postagens')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro ao salvar a postagem.')
			console.log(error)
			res.redirect('/admin/postagens')
		})
	}
})

router.get('/postagens/edit/:id', role, (req, res) => {
	Postagem.findOne({_id: req.params.id}).lean().then((postagem) => {
		Categoria.find().lean().then((categorias) => {
			res.render('admin/editpostagens', {categorias: categorias, postagem: postagem})
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno ao listar as categorias.')
			res.redirect('/admin/postagens')
		})
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao carregar o formulário de edição.')
		res.redirect('/admin/postagens')
	})
})

router.post('/postagens/edit', role, (req, res) => {
	Postagem.findOne({_id: req.body.id}).then((postagem) => {
		postagem.titulo = req.body.titulo
		postagem.slug 	= req.body.slug
		postagem.descricao = req.body.descricao
		postagem.conteudo	= req.body.conteudo
		postagem.categoria 	= req.body.categoria

		postagem.save().then(() => {
			req.flash('success_message', 'Postagem editada com sucesso!')
			res.redirect('/admin/postagens')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro ao editar a postagem.')
			res.redirect('/admin/postagens')
		})
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao salvar a edição da postagem.')
		res.redirect('/admin/postagens')
	})
})

router.post('/postagens/deletar', role, (req, res) => {
	Postagem.deleteOne({_id: req.body.id}).then(() => {
		req.flash('success_message', 'Postagem deletada com sucesso!')
		res.redirect('/admin/postagens')
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao deletar postagem.')
		res.redirect('/admin/postagens')
	})
})

router.get('/usuarios/lista', role, (req, res) => {
	Usuario.find().lean().then((usuarios) => {
		res.render('admin/listaUsuarios', {usuarios: usuarios})
	}).catch((error) => {
		req.flash('error_message', 'Houve um erro ao carregar a página.')
		res.redirect('/')
	})
})

router.post('/usuarios/banir', role, (req, res) => {
	Usuario.findOne({_id: req.body.id}).then((usuario) => {
		usuario.banido = true

		usuario.save().then(() => {
			req.flash('success_message', 'Usuário banido com sucesso.')

			let admin = req.user.nome
			let data = moment().format('ll')
			let blog = "Blog do Sam"
			let motivo = req.body.messagetext
			let appeal = 'http://localhost:8080/appeal/usuario/' + req.body.id

			mailer.sendMail({
				to: usuario.email,
				from: 'sam@gmail.com',
				subject: 'VOCÊ FOI BANIDO!',
				template: 'user_banned/ban',
				context: { data, blog, motivo, appeal, admin }
			}, (err) => {
				if (err)
					console.log('Não foi possível enviar e-mail de notificação: ' + err)
			})

			res.redirect('/admin/usuarios/lista')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro ao banir o usuário.')
			res.redirect('/admin/usuarios/lista')
		})
	}).catch((error) => {
		console.log(error)
		req.flash('error_message', 'Houve um erro ao procurar o usuário.')
		res.redirect('/admin/usuarios/lista')
	})
})

router.post('/usuarios/desbanir', role, (req, res) => {
	Usuario.findOne({_id: req.body.id}).then((usuario) => {
		usuario.banido = false

		usuario.save().then(() => {
			req.flash('success_message', 'Usuário desbanido com sucesso.')

			let admin = req.user.nome
			let data = moment().format('ll')
			let blog = "Blog do Sam"
			let motivo = req.body.messagetext
			let appeal = 'http://localhost:8080/appeal/usuario/' + req.body.id

			mailer.sendMail({
				to: usuario.email,
				from: 'sam@gmail.com',
				subject: 'Você não está mais banido!',
				template: 'user_banned/unban',
				context: { data, blog, motivo, appeal, admin }
			}, (err) => {
				if (err)
					console.log('Não foi possível enviar e-mail de notificação: ' + err)
			})

			res.redirect('/admin/usuarios/lista')
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro ao banir o usuário.')
			res.redirect('/admin/usuarios/lista')
		})
	}).catch((error) => {
		console.log(error)
		req.flash('error_message', 'Houve um erro ao procurar o usuário.')
		res.redirect('/admin/usuarios/lista')
	})
})

module.exports = router