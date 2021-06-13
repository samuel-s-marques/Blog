const path = require('path')
const nodemailer = require('nodemailer')
const handlebars = require('nodemailer-express-handlebars')
const { host, port, user, pass } = require('../config/mail.json')

const transport = nodemailer.createTransport({
	host,
	port,
	auth: { user, pass }
})

transport.use('compile', handlebars({
	viewEngine: {
		extName: '.html',
		defaultLayout: false,
		partialsDir: path.resolve('./resources/mail/')
	},
	viewPath: path.resolve('./resources/mail/'),
	extName: '.html'
}))

module.exports = transport