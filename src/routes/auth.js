const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	refreshTokenGenerator = require( "../utils/refreshTokenGenerator" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	User = require( "../models/User" ),
	errors = require( "../utils/errors" );

Router.post( "/signup", ( req, res, next ) => {
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ||
			!credentials.username || !credentials.fullname ) {
		return next( errors.blankData());
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
				username: user.username,
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

	if ( !req.body.userId || !req.body.refreshToken ) {
		return next( errors.blankData());
	}

	userId = req.body.userId;

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			if ( user.refreshToken !== req.body.refreshToken ) {
				return next( errors.unauthorized());
			}
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
			res.send({
				token: tokenGenerator( user ),
				refreshToken: refreshTokenGenerator( user ),
				username: user.username,
				id: user._id
			});
		}).catch( err => next( err ));
});

module.exports = Router;
