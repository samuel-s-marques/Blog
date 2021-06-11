module.exports = {
	role: function(req, res, next){
		if(req.isAuthenticated() && req.user.role == 1){
			return next()
		}

		req.flash('error_message', 'Você precisa ser um administrador!')
		res.redirect('/')
	}
}