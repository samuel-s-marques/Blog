module.exports = {
	isLogged: function(req, res, next){
		if(req.user){
			return next()
		}

		req.flash('error_message', 'Você precisa estar logado!')
		res.redirect('/usuarios/login')
	}
}