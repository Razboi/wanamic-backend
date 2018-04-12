const
	Router = require( "express" ).Router(),
	User = require( "../models/User" );

Router.get( "/:username", ( req, res, next ) => {
	var
		err,
		data;

	if ( !req.params.username ) {
		err = new Error( "User doesn't exist" );
		err.statusCode = 404;
		return next( err );
	}

	User.findOne({ email: req.params.username })
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			data = {
				username: user.email, fullname: user.fullname, friends: user.friends,
				description: user.description, keywords: user.keywords
			};
			res.send( data );
		}).catch( err => next( err ));
});


Router.post( "/info", ( req, res, next ) => {
	var
		err,
		data,
		userId;

	if ( !req.body.token || !req.body.data ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	data = req.body.data;

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			if ( data.description ) {
				user.description = data.description;
			}
			if ( data.keywords ) {
				user.keywords = data.keywords;
			}
			if ( data.fullname ) {
				user.fullname = data.fullname;
			}
			if ( data.username ) {
				user.username = data.username;
			}
			user.save()
				.then( res.sendStatus( 201 ))
				.catch( err => next( err ));
		});
});


module.exports = Router;
