const
	router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" );

router.post( "/signup", ( req, res, next ) => {
	var err;
	const credentials = req.body.credentials;

	if ( !credentials.email || !credentials.password ) {
		err = new Error( "Empty credentials" );
		err.statusCode = 422;
		return next( err );
	}

	User.findOne({ email: credentials.email })
		.then( user => {
			if ( user ) {
				err = new Error( "Already registered email" );
				err.statusCode = 422;
				return next( err );
			} else {
				new User({
					email: credentials.email,
					passwordHash: bcrypt.hashSync( credentials.password, 10 )
				})
					.save()
					.then( user => {
						const token = tokenGenerator( user );
						res.status( 201 );
						res.send( token );
					})
					.catch( err => next( err ));
			}
		})
		.catch( err => next( err ));
});

module.exports = router;
