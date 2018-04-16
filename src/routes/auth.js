const
	router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" );

router.post( "/signup", ( req, res, next ) => {
	var err;
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ||
			!credentials.username || !credentials.fullname ) {
		err = new Error( "Empty credentials" );
		err.statusCode = 422;
		return next( err );
	}

	// if the username is registered return error
	User.findOne({ username: credentials.username })
		.exec()
		.then( user => {
			if ( user ) {
				err = new Error( "Username already registered" );
				err.statusCode = 422;
				return next( err );
			}
		}).catch( err => next( err ));

	// if email is registered return error, else create the new user and send a token
	User.findOne({ email: credentials.email })
		.exec()
		.then( user => {
			if ( user ) {
				err = new Error( "Already registered email" );
				err.statusCode = 422;
				return next( err );

			} else {
				new User({
					email: credentials.email,
					username: credentials.username,
					fullname: credentials.fullname,
					passwordHash: bcrypt.hashSync( credentials.password, 10 )
				})
					.save()
					.then( user => {
						const token = tokenGenerator( user );
						res.status( 201 );
						res.send({ token: token, username: user.username });
					})
					.catch( err => next( err ));
			}
		})
		.catch( err => next( err ));
});


router.post( "/login", ( req, res, next ) => {
	var err;
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ) {
		err = new Error( "Empty credentials" );
		err.statusCode = 422;
		return next( err );
	}

	// find a user with that email. if the user doesn't exist
	// or the password is invalid return a error. else return a token
	User.findOne({ email: credentials.email })
		.exec()
		.then( user => {

			if ( !user ) {
				err = new Error( "Email is not registered" );
				err.statusCode = 404;
				return next( err );
			}

			if ( !user.isValidPassword( credentials.password )) {
				err = new Error( "Invalid password" );
				err.statusCode = 401;
				return next( err );
			}

			const token = tokenGenerator( user );
			res.send({ token: token, username: user.username });

		})
		.catch( err => next( err ));
});


module.exports = router;
