const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	jwt = require( "jsonwebtoken" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	refreshTokenGenerator = require( "../utils/refreshTokenGenerator" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	User = require( "../models/User" ),
	errors = require( "../utils/errors" ),
	validateEmail = require( "../utils/validateEmail" );

Router.post( "/signup", ( req, res, next ) => {
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ||
			!credentials.username || !credentials.fullname ) {
		return next( errors.blankData());
	}

	if ( !validateEmail( credentials.email )) {
		return next( errors.invalidEmailFormat());
	}
	if ( !/^(?=.*\d)(?=.*[a-zA-Z]).{8,}$/.test( credentials.password )) {
		return next( errors.invalidPasswordFormat());
	}
	if ( credentials.username.length > 20 ) {
		return next( errors.invalidUsernameFormat());
	}
	if ( credentials.fullname.length > 30 ) {
		return next( errors.invalidFullnameFormat());
	}
	if ( !/[a-z\s]+$/i.test( credentials.fullname )) {
		return next( errors.invalidFullnameFormat());
	}
	if ( !/[\w]+$/.test( credentials.username )
	|| /[\s.]/.test( credentials.username )) {
		errors.invalidUsernameFormat();
	}

	User.findOne({ username: credentials.username })
		.exec()
		.then( user => {
			if ( user ) {
				return next( errors.registeredUsername());
			}
			User.findOne({ email: credentials.email })
				.exec()
				.then( user => {
					if ( user ) {
						return next( errors.registeredEmail());
					}
					new User({
						email: credentials.email,
						username: credentials.username,
						fullname: credentials.fullname,
						passwordHash: bcrypt.hashSync( credentials.password, 10 )
					})
						.save()
						.then( user => {
							res.status( 201 );
							res.send({
								token: tokenGenerator( user ),
								refreshToken: refreshTokenGenerator( user ),
								profileImage: user.profileImage && user.profileImage,
								username: user.username,
								id: user._id
							});
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/login", ( req, res, next ) => {
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ) {
		return next( errors.blankData());
	}

	User.findOne({ email: credentials.email })
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.invalidEmail());
			}
			if ( !user.isValidPassword( credentials.password )) {
				return next( errors.invalidPassword());
			}

			res.send({
				token: tokenGenerator( user ),
				refreshToken: user.refreshToken,
				profileImage: user.profileImage && user.profileImage,
				username: user.username,
				fullname: user.fullname,
				id: user._id
			});
		}).catch( err => next( err ));
});


Router.post( "/verify", ( req, res, next ) => {
	var userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	res.sendStatus( 200 );
});


Router.post( "/token", ( req, res, next ) => {
	var userId;

	if ( !req.body.refreshToken ) {
		return next( errors.blankData());
	}

	try {
		data = jwt.verify( req.body.refreshToken, process.env.SECRET_REFRESH );
	} catch ( err ) {
		err.statusCode = 401;
		return next( err );
	}

	userId = data.id;

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			if ( user.refreshToken !== req.body.refreshToken ) {
				return next( errors.unauthorized());
			}
			res.status( 201 );
			res.send({ token: tokenGenerator( user ) });
		}).catch( err => next( err ));
});


Router.post( "/refreshToken", ( req, res, next ) => {
	var userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			res.status( 201 );
			res.send({
				refreshToken: refreshTokenGenerator( user )
			});
		}).catch( err => next( err ));
});

module.exports = Router;
