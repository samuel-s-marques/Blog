//	Carregando módulos
	const express 		= require('express')
	const handlebars 	= require('express-handlebars')
	const bodyParser 	= require('body-parser')
	const app 			= express()

	const admin 		= require('./routes/admin')
	const usuarios 		= require('./routes/usuario')
	const path 			= require('path')
	const mongoose 		= require('mongoose')
	const session 		= require('express-session')
	const flash 		= require('connect-flash')
	const moment		= require('moment')
	moment.locale('pt-br')
	require('./models/Postagem.js')
	const Postagem		= mongoose.model('postagens')
	require('./models/Categoria.js')
	const Categoria 	= mongoose.model('categorias')
	require('./models/Usuario')
	const Usuario 		= mongoose.model('usuarios')
	const passport 		= require('passport')
	require('./config/auth.js')(passport)

//	Configurações
	//	Sessão
		app.use(session({
			secret: 'teste_qualquercoisa',
			resave: true,
			saveUninitialized: true
		}))

		app.use(passport.initialize())
		app.use(passport.session())
		app.use(flash())

	//	Middleware
		app.use((req, res, next) => {
			res.locals.success_message 	= req.flash('success_message')
			res.locals.error_message	= req.flash('error_message')
			res.locals.error 			= req.flash('error')

			if (req.user){
				res.locals.user 		= req.user.toObject()
			}

			next()
		})

	// 	Body parser
		app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}))
		app.use(bodyParser.json({limit: '50mb'}))

	// 	Handlebars
		app.engine('handlebars', handlebars({defaultLayout: 'main', helpers: {
			section: function(name, options){
				if(!this._sections) this._sections = {};
				this._sections[name] = options.fn(this);
				return null;
			},
			formatDate: (date) => {
				return moment(date).format('LLLL')
			}
		}}))
		app.set('view engine', 'handlebars')

	// 	Mongoose
		mongoose.Promise = global.Promise
		mongoose.set('useFindAndModify', false)
		mongoose.connect('mongodb://localhost/blogapp', {
			useNewUrlParser: true,
			useUnifiedTopology: true
		}).then(() => {
			console.log('MongoDB conectado')
		}).catch((erro) => {
			console.log('Erro na conexao do MongoDB: ' + erro)
		})

	//	Public
		app.use(express.static(path.join(__dirname, 'public')))

// 	Rotas
	app.get('/', (req, res) => {
		Postagem.find().lean().populate('categoria').sort({data: 'desc'}).then((postagens) => {
			res.render('index', {postagens: postagens})
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno!')
			res.redirect('/')
		})
	})

	app.get('/postagem/:slug', (req, res) => {
		Postagem.findOne({slug: req.params.slug}).lean().populate('categoria').then((postagem) => {
			if (postagem){
				res.render('postagem/index', {postagem: postagem})
			} else {
				req.flash('error_message', 'Esta postagem não existe.')
				res.redirect('/')
			}
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno.')
			res.redirect('/')
		})
	})

	app.post('/postagem/salvar', (req, res) => {
		const arquivosSalvos = {
			slug: req.body.slug
		}

		Usuario.findOne({_id: req.user._id}).then((usuario) => {
			Usuario.find({'arquivos.slug': req.body.slug},
				{ arquivos:
					{ $elemMatch:
						{
							slug: req.body.slug
						}
					}
				}, (error, result) => {
					if(error){
						console.log('ERRO AO PROCURAR O SLUG ' + req.body.slug + ': ' + error)
					} else {
						if (result.length < 1){
							Usuario.findOneAndUpdate(
								{	_id: req.user.id },
								{ 	$push: {arquivos: arquivosSalvos } },

								(error, success) => {
									if(error){
										console.log('ERRO AO ADICIONAR O SLUG ' + req.body.slug + ': ' + error)
									} else {
										console.log('SUCESSO AO ADICIONAR O SLUG ' + req.body.slug + ': ' + success)
									}
								}
							)
						} else {
							Usuario.findOneAndUpdate(
								{	_id: req.user.id },
								{ 	$pull: {arquivos: arquivosSalvos } },

								(error, success) => {
									if(error){
										console.log('ERRO AO REMOVER O SLUG ' + req.body.slug + ': ' + error)
									} else {
										console.log('SUCESSO AO REMOVER O SLUG ' + req.body.slug + ': ' + success)
									}
								}
							)
						}
					}
				}
			)
		})

		res.status(200).send('OK')
	})

	app.get('/postagens', (req, res) => {
		Postagem.find().lean().populate('categoria').sort({data: 'desc'}).then((postagens) => {
			res.render('postagem/lista', {postagens: postagens})
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno ao listar as postagens.')
			res.redirect('/')
		})
	})

	app.get('/categorias', (req, res) => {
		Categoria.find().lean().then((categorias) => {
			res.render('categorias/index', {categorias: categorias})
		}).catch((error) => {
			req.flash('error_message', 'Houve um erro interno ao listar as categorias.')
			res.redirect('/')
		})
	})

	app.get('/categorias/:slug', (req, res) => {
		Categoria.findOne({slug: req.params.slug}).lean().then((categoria) => {
			if(categoria) {
				Postagem.find({categoria: categoria._id}).then((postagens) => {
					res.render('categorias/postagens', {postagens: postagens.map(Categoria => Categoria.toJSON()), categoria: categoria})
				}).catch((error) => {
					req.flash('error_message', 'Houve um erro ao listar os posts!')
					res.redirect('/')
				})
			} else {
				req.flash('error_message', 'Esta categoria não existe.')
				res.redirect('/')
			}
		}).catch((error) => {
			req.flash('error_message', 'Houve um interno ao carregar a página desta categoria.')
			res.redirect('/')
		})
	})

	app.use('/admin', admin)
	app.use('/usuarios', usuarios)

	app.get('*', (req, res) => {
		res.status(404).render('error/404')
	})

//	Outros
const PORT = 8080

app.listen(PORT, () => {
	console.log('Rodando em http://localhost:' + PORT)
})